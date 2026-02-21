import { Router, Request, Response } from "express";

import prisma from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/tech/assigned — ดูรายการงานที่ได้รับมอบหมาย
// Query: ?status=IN_PROGRESS
// ---------------------------------------------------------------------------
router.get(
  "/assigned",
  authenticate,
  checkRole("TECH", "ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const techId = req.user!.id;
      const { status } = req.query as Record<string, string>;

      const where: Record<string, unknown> = { techId };
      if (status) where["status"] = status;

      const jobs = await prisma.repairRequest.findMany({
        where,
        orderBy: [
          // เรียงตาม priority ก่อน (HIGH -> MEDIUM -> LOW) แล้วตามวันที่
          { priority: "desc" },
          { createdAt: "asc" },
        ],
        include: {
          user: { select: { id: true, name: true, email: true } },
          statusLogs: {
            orderBy: { changedAt: "desc" },
            take: 1, // log ล่าสุดอย่างเดียว
          },
        },
      });

      res.status(200).json({ success: true, data: jobs });
    } catch (error) {
      console.error("[GET /api/tech/assigned]", error);
      res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/tech/assigned/:id — ดูรายละเอียดงานชิ้นนั้น (ต้องเป็นงานของตัวเอง)
// ---------------------------------------------------------------------------
router.get(
  "/assigned/:id",
  authenticate,
  checkRole("TECH", "ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const techId = req.user!.id;
      const id     = req.params["id"] as string;

      const job = await prisma.repairRequest.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, email: true } },
          statusLogs: {
            orderBy: { changedAt: "asc" },
            include: { changedByUser: { select: { id: true, name: true, role: true } } },
          },
        },
      });

      if (!job) {
        res.status(404).json({ success: false, message: `ไม่พบคำร้อง ID: ${id}` });
        return;
      }

      // TECH ดูได้เฉพาะงานที่มอบหมายให้ตัวเอง
      if (req.user!.role === "TECH" && job.techId !== techId) {
        res.status(403).json({ success: false, message: "คำร้องนี้ไม่ได้รับมอบหมายให้คุณ" });
        return;
      }

      res.status(200).json({ success: true, data: job });
    } catch (error) {
      console.error("[GET /api/tech/assigned/:id]", error);
      res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
    }
  }
);

export default router;
