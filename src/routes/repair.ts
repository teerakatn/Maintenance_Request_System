import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { ZodError } from "zod";

import prisma from "../lib/prisma";
import { generateRepairId } from "../lib/generateId";
import { authenticate } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";
import { createRepairSchema, updateStatusSchema } from "../schemas/repair.schema";
import { sendStatusChangedEmail } from "../lib/email";

const router = Router();

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
    cb(null, "uploads/");
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

      // สร้าง ID ในรูปแบบ REP-YYYYMMDD-XXXX
      const id = await generateRepairId();

      const newRequest = await prisma.repairRequest.create({
        data: {
          id,
          deviceName,
          description,
          priority,
          imageUrl,
          userId,
        },
        select: {
          id: true,
          deviceName: true,
          description: true,
          priority: true,
          status: true,
          imageUrl: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });

      res.status(201).json({
        success: true,
        message: "ส่งคำร้องแจ้งซ่อมเรียบร้อยแล้ว",
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
            status: true,
            repairNote: true,
            updatedAt: true,
            technician: { select: { id: true, name: true } },
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

export default router;
