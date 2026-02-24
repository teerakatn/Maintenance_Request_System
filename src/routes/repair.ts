import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

import prisma from "../lib/prisma";
import { generateRepairId } from "../lib/generateId";
import { findLeastLoadedTech } from "../lib/autoAssign";
import { authenticate } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";
import { createRepairSchema, updateStatusSchema } from "../schemas/repair.schema";
import { sendStatusChangedEmail, sendAssignedEmail } from "../lib/email";

const router = Router();

// ---------------------------------------------------------------------------
// Valid status transitions ตาม PRD (ห้ามข้ามลำดับ)
// ---------------------------------------------------------------------------
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING:        ["IN_PROGRESS"],
  IN_PROGRESS:    ["WAITING_REVIEW"],
  WAITING_REVIEW: ["COMPLETED"],
  COMPLETED:      [],               // terminal state
};

// จำนวนครั้ง retry สูงสุดเมื่อเกิด duplicate ID (race condition)
const MAX_ID_RETRIES = 5;

// ---------------------------------------------------------------------------
// GET /api/repair/me
// ดึงรายการแจ้งซ่อมของ User คนปัจจุบัน
// ---------------------------------------------------------------------------
router.get(
  "/me",
  authenticate,
  checkRole("USER", "TECH", "ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      const requests = await prisma.repairRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          deviceName: true,
          description: true,
          priority: true,
          status: true,
          imageUrl: true,
          repairNote: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true, email: true } },
          technician: { select: { id: true, name: true, email: true } },
        },
      });

      res.status(200).json({ success: true, data: requests });
    } catch (error) {
      console.error("[GET /api/repair/me]", error);
      res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/repair/:id
// ดึงรายละเอียดคำร้อง + ประวัติสถานะทั้งหมด
// ---------------------------------------------------------------------------
router.get(
  "/:id",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params["id"] as string;
      const { role, id: userId } = req.user!;

      const request = await prisma.repairRequest.findUnique({
        where: { id },
        include: {
          user:        { select: { id: true, name: true, email: true } },
          technician:  { select: { id: true, name: true, email: true } },
          statusLogs: {
            orderBy: { changedAt: "asc" },
            include: { changedByUser: { select: { id: true, name: true, role: true } } },
          },
        },
      });

      if (!request) {
        res.status(404).json({ success: false, message: `ไม่พบคำร้อง ID: ${id}` });
        return;
      }

      // USER ดูได้เฉพาะงานของตัวเอง
      if (role === "USER" && request.userId !== userId) {
        res.status(403).json({ success: false, message: "ไม่มีสิทธิ์ดูคำร้องนี้" });
        return;
      }

      res.status(200).json({ success: true, data: request });
    } catch (error) {
      console.error("[GET /api/repair/:id]", error);
      res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
    }
  }
);

// ---------------------------------------------------------------------------
// Multer Configuration — รองรับเฉพาะไฟล์รูปภาพ ขนาดไม่เกิน 5MB
// ---------------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `repair-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const isValid =
      allowed.test(path.extname(file.originalname).toLowerCase()) &&
      allowed.test(file.mimetype);

    if (isValid) {
      cb(null, true);
    } else {
      cb(new Error("รองรับเฉพาะไฟล์รูปภาพ (jpeg, jpg, png, webp) เท่านั้น"));
    }
  },
});

// ---------------------------------------------------------------------------
// POST /api/repair
// สร้างคำร้องแจ้งซ่อมใหม่ — เฉพาะ USER และ ADMIN
// ---------------------------------------------------------------------------
router.post(
  "/",
  authenticate,
  checkRole("USER", "ADMIN"),
  upload.single("image"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate body ด้วย Zod
      const parsed = createRepairSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: "ข้อมูลไม่ถูกต้อง",
          errors: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { deviceName, description, priority } = parsed.data;
      const userId = req.user!.id;
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

      // หาช่างที่ว่างที่สุด (least active tasks) เพื่อ auto-assign
      const autoTech = await findLeastLoadedTech();
      const autoTechId = autoTech?.id ?? undefined;

      // สร้าง ID ในรูปแบบ REP-YYYYMMDD-XXXX พร้อม retry กรณี race condition
      let newRequest;
      for (let attempt = 0; attempt < MAX_ID_RETRIES; attempt++) {
        try {
          const id = await generateRepairId();
          newRequest = await prisma.repairRequest.create({
            data: { id, deviceName, description, priority, imageUrl, userId, techId: autoTechId },
            select: {
              id: true,
              deviceName: true,
              description: true,
              priority: true,
              status: true,
              imageUrl: true,
              createdAt: true,
              user: { select: { id: true, name: true, email: true } },
              technician: { select: { id: true, name: true, email: true } },
            },
          });
          break; // สร้างสำเร็จ ออกจาก loop
        } catch (err) {
          // P2002 = Unique constraint violation → retry
          const isPrismaUniqueError =
            err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
          if (isPrismaUniqueError && attempt < MAX_ID_RETRIES - 1) continue;
          throw err; // ไม่ใช่ duplicate หรือ retry หมดแล้ว
        }
      }

      // ส่ง Email แจ้งช่างที่ถูก auto-assign (fire-and-forget)
      if (autoTech && newRequest) {
        sendAssignedEmail({
          toEmail:    autoTech.email,
          toName:     autoTech.name,
          requestId:  newRequest.id,
          deviceName,
          priority:   priority ?? "MEDIUM",
        }).catch((err) => console.error("[Email] sendAssigned (auto) failed:", err));
      }

      res.status(201).json({
        success: true,
        message: autoTech
          ? `ส่งคำร้องแจ้งซ่อมเรียบร้อยแล้ว (มอบหมายให้ช่าง ${autoTech.name} อัตโนมัติ)`
          : "ส่งคำร้องแจ้งซ่อมเรียบร้อยแล้ว (ยังไม่มีช่างในระบบ รอ Admin มอบหมาย)",
        data: newRequest,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "ข้อมูลไม่ถูกต้อง",
          errors: error.flatten().fieldErrors,
        });
        return;
      }
      console.error("[POST /api/repair]", error);
      res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/repair/:id/status
// อัปเดตสถานะและบันทึกวิธีซ่อม — เฉพาะ TECH และ ADMIN
// ---------------------------------------------------------------------------
router.patch(
  "/:id/status",
  authenticate,
  checkRole("TECH", "ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params["id"] as string;
      const changedBy = req.user!.id;

      // Validate body ด้วย Zod
      const parsed = updateStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: "ข้อมูลไม่ถูกต้อง",
          errors: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { status, repairNote, remark } = parsed.data;

      // ดึง request เดิม + user (เพื่อส่ง email)
      const existing = await prisma.repairRequest.findUnique({
        where: { id },
        include: { user: { select: { email: true, name: true } } },
      });

      if (!existing) {
        res.status(404).json({ success: false, message: `ไม่พบคำร้อง ID: ${id}` });
        return;
      }

      // ตรวจสอบว่า status transition ถูกต้องตาม workflow (ห้ามข้ามลำดับ)
      const allowed = VALID_TRANSITIONS[existing.status];
      if (!allowed || !allowed.includes(status)) {
        res.status(400).json({
          success: false,
          message: `ไม่สามารถเปลี่ยนสถานะจาก "${existing.status}" เป็น "${status}" ได้`,
        });
        return;
      }

      // ตรวจสอบสิทธิ์: TECH ทำได้เฉพาะงานที่ถูก assign ให้ตัวเอง
      if (req.user!.role === "TECH" && existing.techId !== changedBy) {
        res.status(403).json({
          success: false,
          message: "คุณไม่มีสิทธิ์อัปเดตงานชิ้นนี้ เนื่องจากยังไม่ได้รับมอบหมาย",
        });
        return;
      }

      // Transaction: update request + สร้าง StatusLog พร้อมกัน
      const [updatedRequest] = await prisma.$transaction([
        prisma.repairRequest.update({
          where: { id },
          data: {
            status,
            repairNote: repairNote ?? undefined,
            // เมื่อ TECH รับงาน ให้ assign techId อัตโนมัติ
            ...(status === "IN_PROGRESS" && existing.techId === null
              ? { techId: changedBy }
              : {}),
          },
          select: {
            id: true,
            deviceName: true,
            description: true,
            priority: true,
            status: true,
            imageUrl: true,
            repairNote: true,
            createdAt: true,
            updatedAt: true,
            user: { select: { id: true, name: true, email: true } },
            technician: { select: { id: true, name: true, email: true } },
          },
        }),

        prisma.statusLog.create({
          data: {
            requestId: id,
            oldStatus: existing.status,
            newStatus: status,
            remark: remark ?? null,
            changedBy,
          },
        }),
      ]);

      // ส่ง Email แจ้งเตือนผู้แจ้งซ่อม (fire-and-forget ไม่หยุดรอ)
      sendStatusChangedEmail({
        toEmail:    existing.user.email,
        toName:     existing.user.name,
        requestId:  id,
        deviceName: existing.deviceName,
        newStatus:  status,
      }).catch((err) => console.error("[Email] sendStatusChanged failed:", err));

      res.status(200).json({
        success: true,
        message: `อัปเดตสถานะเป็น "${status}" เรียบร้อยแล้ว`,
        data: updatedRequest,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "ข้อมูลไม่ถูกต้อง",
          errors: error.flatten().fieldErrors,
        });
        return;
      }
      console.error("[PATCH /api/repair/:id/status]", error);
      res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/repair/:id/confirm
// ผู้แจ้งซ่อม (USER) ยืนยันรับงาน: WAITING_REVIEW → COMPLETED (ตาม PRD)
// ---------------------------------------------------------------------------
router.patch(
  "/:id/confirm",
  authenticate,
  checkRole("USER", "ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params["id"] as string;
      const userId = req.user!.id;

      const existing = await prisma.repairRequest.findUnique({
        where: { id },
        include: { user: { select: { email: true, name: true } } },
      });

      if (!existing) {
        res.status(404).json({ success: false, message: `ไม่พบคำร้อง ID: ${id}` });
        return;
      }

      // USER ยืนยันได้เฉพาะคำร้องของตัวเอง
      if (req.user!.role === "USER" && existing.userId !== userId) {
        res.status(403).json({ success: false, message: "ไม่มีสิทธิ์ยืนยันคำร้องนี้" });
        return;
      }

      // ยืนยันได้เฉพาะเมื่อสถานะเป็น WAITING_REVIEW
      if (existing.status !== "WAITING_REVIEW") {
        res.status(400).json({
          success: false,
          message: `ยืนยันรับงานได้เฉพาะเมื่อสถานะเป็น "รอตรวจรับ" เท่านั้น (สถานะปัจจุบัน: ${existing.status})`,
        });
        return;
      }

      const [updatedRequest] = await prisma.$transaction([
        prisma.repairRequest.update({
          where: { id },
          data: { status: "COMPLETED" },
          select: {
            id: true,
            deviceName: true,
            description: true,
            priority: true,
            status: true,
            imageUrl: true,
            repairNote: true,
            createdAt: true,
            updatedAt: true,
            user: { select: { id: true, name: true, email: true } },
            technician: { select: { id: true, name: true, email: true } },
          },
        }),
        prisma.statusLog.create({
          data: {
            requestId: id,
            oldStatus: "WAITING_REVIEW",
            newStatus: "COMPLETED",
            remark: "ผู้แจ้งซ่อมยืนยันรับงาน",
            changedBy: userId,
          },
        }),
      ]);

      // แจ้งเตือนผู้แจ้งซ่อมทาง Email
      sendStatusChangedEmail({
        toEmail:    existing.user.email,
        toName:     existing.user.name,
        requestId:  id,
        deviceName: existing.deviceName,
        newStatus:  "COMPLETED",
      }).catch((err) => console.error("[Email] sendStatusChanged failed:", err));

      res.status(200).json({
        success: true,
        message: "ยืนยันรับงานเรียบร้อยแล้ว ขอบคุณครับ/ค่ะ",
        data: updatedRequest,
      });
    } catch (error) {
      console.error("[PATCH /api/repair/:id/confirm]", error);
      res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
    }
  }
);

export default router;
