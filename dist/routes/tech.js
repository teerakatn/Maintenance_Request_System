"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const checkRole_1 = require("../middleware/checkRole");
const router = (0, express_1.Router)();
// ---------------------------------------------------------------------------
// GET /api/tech/assigned — ดูรายการงานที่ได้รับมอบหมาย
// Query: ?status=IN_PROGRESS
// ---------------------------------------------------------------------------
router.get("/assigned", auth_1.authenticate, (0, checkRole_1.checkRole)("TECH", "ADMIN"), async (req, res) => {
    try {
        const techId = req.user.id;
        const { status } = req.query;
        const where = { techId };
        if (status)
            where["status"] = status;
        const jobs = await prisma_1.default.repairRequest.findMany({
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
    }
    catch (error) {
        console.error("[GET /api/tech/assigned]", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
    }
});
// ---------------------------------------------------------------------------
// GET /api/tech/assigned/:id — ดูรายละเอียดงานชิ้นนั้น (ต้องเป็นงานของตัวเอง)
// ---------------------------------------------------------------------------
router.get("/assigned/:id", auth_1.authenticate, (0, checkRole_1.checkRole)("TECH", "ADMIN"), async (req, res) => {
    try {
        const techId = req.user.id;
        const id = req.params["id"];
        const job = await prisma_1.default.repairRequest.findUnique({
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
        if (req.user.role === "TECH" && job.techId !== techId) {
            res.status(403).json({ success: false, message: "คำร้องนี้ไม่ได้รับมอบหมายให้คุณ" });
            return;
        }
        res.status(200).json({ success: true, data: job });
    }
    catch (error) {
        console.error("[GET /api/tech/assigned/:id]", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
    }
});
exports.default = router;
