import { Router, Request, Response } from "express";
import ExcelJS from "exceljs";

import prisma from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";
import { sendAssignedEmail } from "../lib/email";
import { z } from "zod";

const router = Router();

// ── ใช้ทุก route ต้องเป็น ADMIN ──────────────────────────────────────────────
router.use(authenticate, checkRole("ADMIN"));

// ---------------------------------------------------------------------------
// GET /api/admin/repairs — ดึงคำร้องทั้งหมดในระบบ พร้อม filter
// Query: ?status=PENDING&priority=HIGH&page=1&limit=20
// ---------------------------------------------------------------------------
router.get("/repairs", async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, priority, techId, page = "1", limit = "20" } = req.query as Record<string, string>;

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const skip     = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (status)   where["status"]   = status;
    if (priority) where["priority"] = priority;
    if (techId) {
      const parsedTechId = parseInt(techId);
      if (isNaN(parsedTechId)) {
        res.status(400).json({ success: false, message: "techId ต้องเป็นตัวเลข" });
        return;
      }
      where["techId"] = parsedTechId;
    }

    const [total, requests] = await prisma.$transaction([
      prisma.repairRequest.count({ where }),
      prisma.repairRequest.findMany({
        where,
        skip,
        take:    limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          user:       { select: { id: true, name: true, email: true } },
          technician: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: requests,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error("[GET /api/admin/repairs]", error);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/repairs/:id/assign — มอบหมายงานให้ช่าง
// ---------------------------------------------------------------------------
router.patch(
  "/repairs/:id/assign",
  async (req: Request, res: Response): Promise<void> => {
    const schema = z.object({
      techId: z.number({ error: "กรุณาระบุ techId" }).int().positive(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "ข้อมูลไม่ถูกต้อง",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const id     = req.params["id"] as string;
    const techId = parsed.data.techId;

    try {
      // ตรวจสอบว่า tech มีอยู่จริงและเป็น TECH
      const tech = await prisma.user.findUnique({
        where: { id: techId },
        select: { id: true, name: true, email: true, role: true },
      });

      if (!tech || tech.role !== "TECH") {
        res.status(400).json({ success: false, message: "ไม่พบช่างที่ระบุ หรือ User นี้ไม่ใช่ช่าง" });
        return;
      }

      const request = await prisma.repairRequest.findUnique({
        where: { id },
        select: { id: true, deviceName: true, priority: true, status: true },
      });

      if (!request) {
        res.status(404).json({ success: false, message: `ไม่พบคำร้อง ID: ${id}` });
        return;
      }

      const updated = await prisma.repairRequest.update({
        where: { id },
        data: { techId },
        include: {
          user:       { select: { id: true, name: true, email: true } },
          technician: { select: { id: true, name: true, email: true } },
        },
      });

      // ส่ง Email แจ้งช่าง (fire-and-forget)
      sendAssignedEmail({
        toEmail:    tech.email,
        toName:     tech.name,
        requestId:  id,
        deviceName: request.deviceName,
        priority:   request.priority,
      }).catch((err) => console.error("[Email] sendAssigned failed:", err));

      res.status(200).json({
        success: true,
        message: `มอบหมายงานให้ช่าง ${tech.name} เรียบร้อยแล้ว`,
        data: updated,
      });
    } catch (error) {
      console.error("[PATCH /api/admin/repairs/:id/assign]", error);
      res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/admin/technicians — รายชื่อช่างทั้งหมด (สำหรับ dropdown assign)
// ---------------------------------------------------------------------------
router.get("/technicians", async (_req: Request, res: Response): Promise<void> => {
  try {
    const techs = await prisma.user.findMany({
      where: { role: "TECH" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    res.status(200).json({ success: true, data: techs });
  } catch (error) {
    console.error("[GET /api/admin/technicians]", error);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/report/summary — สรุปภาพรวมสำหรับ Dashboard Admin
// ---------------------------------------------------------------------------
router.get("/report/summary", async (_req: Request, res: Response): Promise<void> => {
  try {
    // รวมทุก query ไว้ใน $transaction เดียวกัน — ลดรอบ DB จาก 9 เป็น 1 batch
    const [total, pending, inProgress, waitingReview, completed,
           prioLow, prioMedium, prioHigh, recentRequests] =
      await prisma.$transaction([
        prisma.repairRequest.count(),
        prisma.repairRequest.count({ where: { status: "PENDING" } }),
        prisma.repairRequest.count({ where: { status: "IN_PROGRESS" } }),
        prisma.repairRequest.count({ where: { status: "WAITING_REVIEW" } }),
        prisma.repairRequest.count({ where: { status: "COMPLETED" } }),
        prisma.repairRequest.count({ where: { priority: "LOW" } }),
        prisma.repairRequest.count({ where: { priority: "MEDIUM" } }),
        prisma.repairRequest.count({ where: { priority: "HIGH" } }),
        prisma.repairRequest.findMany({          // 5 คำร้องล่าสุด
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            user:       { select: { name: true } },
            technician: { select: { name: true } },
          },
        }),
      ]);

    res.status(200).json({
      success: true,
      data: {
        counts: { total, pending, inProgress, waitingReview, completed },
        byPriority: [
          { priority: "LOW",    count: prioLow },
          { priority: "MEDIUM", count: prioMedium },
          { priority: "HIGH",   count: prioHigh },
        ],
        recentRequests,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/report/summary]", error);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/report/export — Export Excel
// ---------------------------------------------------------------------------
router.get("/report/export", async (_req: Request, res: Response): Promise<void> => {
  try {
    const requests = await prisma.repairRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user:       { select: { name: true, email: true } },
        technician: { select: { name: true } },
      },
    });

    const STATUS_TH: Record<string, string> = {
      PENDING: "รอดำเนินการ", IN_PROGRESS: "กำลังซ่อม",
      WAITING_REVIEW: "รอตรวจรับ", COMPLETED: "เสร็จสิ้น",
    };
    const PRIORITY_TH: Record<string, string> = {
      LOW: "ต่ำ", MEDIUM: "ปานกลาง", HIGH: "สูง",
    };

    const workbook  = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("คำร้องแจ้งซ่อม");

    worksheet.columns = [
      { header: "เลขที่คำร้อง",    key: "id",          width: 22 },
      { header: "ชื่ออุปกรณ์",     key: "deviceName",  width: 22 },
      { header: "อาการเสีย",       key: "description", width: 40 },
      { header: "ความเร่งด่วน",    key: "priority",    width: 14 },
      { header: "สถานะ",           key: "status",      width: 16 },
      { header: "ผู้แจ้งซ่อม",     key: "user",        width: 20 },
      { header: "ช่างที่รับผิดชอบ", key: "tech",       width: 20 },
      { header: "บันทึกการซ่อม",   key: "repairNote",  width: 40 },
      { header: "วันที่แจ้ง",      key: "createdAt",   width: 20 },
    ];

    // Header style
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
      cell.alignment = { horizontal: "center" };
    });

    requests.forEach((r) => {
      worksheet.addRow({
        id:          r.id,
        deviceName:  r.deviceName,
        description: r.description,
        priority:    PRIORITY_TH[r.priority]  ?? r.priority,
        status:      STATUS_TH[r.status]      ?? r.status,
        user:        r.user?.name    ?? "-",
        tech:        r.technician?.name ?? "ยังไม่ได้มอบหมาย",
        repairNote:  r.repairNote    ?? "-",
        createdAt:   new Date(r.createdAt).toLocaleString("th-TH"),
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="repair-report-${Date.now()}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("[GET /api/admin/report/export]", error);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
  }
});

export default router;
