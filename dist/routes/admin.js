"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const exceljs_1 = __importDefault(require("exceljs"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const checkRole_1 = require("../middleware/checkRole");
const email_1 = require("../lib/email");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// ── ใช้ทุก route ต้องเป็น ADMIN ──────────────────────────────────────────────
router.use(auth_1.authenticate, (0, checkRole_1.checkRole)("ADMIN"));
// ---------------------------------------------------------------------------
// GET /api/admin/repairs — ดึงคำร้องทั้งหมดในระบบ พร้อม filter
// Query: ?status=PENDING&priority=HIGH&page=1&limit=20
// ---------------------------------------------------------------------------
router.get("/repairs", async (req, res) => {
    try {
        const { status, priority, techId, page = "1", limit = "20" } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, parseInt(limit));
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (status)
            where["status"] = status;
        if (priority)
            where["priority"] = priority;
        if (techId)
            where["techId"] = parseInt(techId);
        const [total, requests] = await prisma_1.default.$transaction([
            prisma_1.default.repairRequest.count({ where }),
            prisma_1.default.repairRequest.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { createdAt: "desc" },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    technician: { select: { id: true, name: true, email: true } },
                },
            }),
        ]);
        res.status(200).json({
            success: true,
            data: requests,
            pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
        });
    }
    catch (error) {
        console.error("[GET /api/admin/repairs]", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
    }
});
// ---------------------------------------------------------------------------
// PATCH /api/admin/repairs/:id/assign — มอบหมายงานให้ช่าง
// ---------------------------------------------------------------------------
router.patch("/repairs/:id/assign", async (req, res) => {
    const schema = zod_1.z.object({
        techId: zod_1.z.number({ error: "กรุณาระบุ techId" }).int().positive(),
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
    const id = req.params["id"];
    const techId = parsed.data.techId;
    try {
        // ตรวจสอบว่า tech มีอยู่จริงและเป็น TECH
        const tech = await prisma_1.default.user.findUnique({
            where: { id: techId },
            select: { id: true, name: true, email: true, role: true },
        });
        if (!tech || tech.role !== "TECH") {
            res.status(400).json({ success: false, message: "ไม่พบช่างที่ระบุ หรือ User นี้ไม่ใช่ช่าง" });
            return;
        }
        const request = await prisma_1.default.repairRequest.findUnique({
            where: { id },
            select: { id: true, deviceName: true, priority: true, status: true },
        });
        if (!request) {
            res.status(404).json({ success: false, message: `ไม่พบคำร้อง ID: ${id}` });
            return;
        }
        const updated = await prisma_1.default.repairRequest.update({
            where: { id },
            data: { techId },
            include: {
                user: { select: { id: true, name: true, email: true } },
                technician: { select: { id: true, name: true, email: true } },
            },
        });
        // ส่ง Email แจ้งช่าง (fire-and-forget)
        (0, email_1.sendAssignedEmail)({
            toEmail: tech.email,
            toName: tech.name,
            requestId: id,
            deviceName: request.deviceName,
            priority: request.priority,
        }).catch((err) => console.error("[Email] sendAssigned failed:", err));
        res.status(200).json({
            success: true,
            message: `มอบหมายงานให้ช่าง ${tech.name} เรียบร้อยแล้ว`,
            data: updated,
        });
    }
    catch (error) {
        console.error("[PATCH /api/admin/repairs/:id/assign]", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
    }
});
// ---------------------------------------------------------------------------
// GET /api/admin/technicians — รายชื่อช่างทั้งหมด (สำหรับ dropdown assign)
// ---------------------------------------------------------------------------
router.get("/technicians", async (_req, res) => {
    try {
        const techs = await prisma_1.default.user.findMany({
            where: { role: "TECH" },
            select: { id: true, name: true, email: true },
            orderBy: { name: "asc" },
        });
        res.status(200).json({ success: true, data: techs });
    }
    catch (error) {
        console.error("[GET /api/admin/technicians]", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
    }
});
// ---------------------------------------------------------------------------
// GET /api/admin/report/summary — สรุปภาพรวมสำหรับ Dashboard Admin
// ---------------------------------------------------------------------------
router.get("/report/summary", async (_req, res) => {
    try {
        const [total, pending, inProgress, waitingReview, completed, prioLow, prioMedium, prioHigh] = await prisma_1.default.$transaction([
            prisma_1.default.repairRequest.count(),
            prisma_1.default.repairRequest.count({ where: { status: "PENDING" } }),
            prisma_1.default.repairRequest.count({ where: { status: "IN_PROGRESS" } }),
            prisma_1.default.repairRequest.count({ where: { status: "WAITING_REVIEW" } }),
            prisma_1.default.repairRequest.count({ where: { status: "COMPLETED" } }),
            prisma_1.default.repairRequest.count({ where: { priority: "LOW" } }),
            prisma_1.default.repairRequest.count({ where: { priority: "MEDIUM" } }),
            prisma_1.default.repairRequest.count({ where: { priority: "HIGH" } }),
        ]);
        // 5 คำร้องล่าสุด
        const recentRequests = await prisma_1.default.repairRequest.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { name: true } },
                technician: { select: { name: true } },
            },
        });
        res.status(200).json({
            success: true,
            data: {
                counts: { total, pending, inProgress, waitingReview, completed },
                byPriority: [
                    { priority: "LOW", count: prioLow },
                    { priority: "MEDIUM", count: prioMedium },
                    { priority: "HIGH", count: prioHigh },
                ],
                recentRequests,
            },
        });
    }
    catch (error) {
        console.error("[GET /api/admin/report/summary]", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
    }
});
// ---------------------------------------------------------------------------
// GET /api/admin/report/export — Export Excel
// ---------------------------------------------------------------------------
router.get("/report/export", async (_req, res) => {
    try {
        const requests = await prisma_1.default.repairRequest.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { name: true, email: true } },
                technician: { select: { name: true } },
            },
        });
        const STATUS_TH = {
            PENDING: "รอดำเนินการ", IN_PROGRESS: "กำลังซ่อม",
            WAITING_REVIEW: "รอตรวจรับ", COMPLETED: "เสร็จสิ้น",
        };
        const PRIORITY_TH = {
            LOW: "ต่ำ", MEDIUM: "ปานกลาง", HIGH: "สูง",
        };
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet("คำร้องแจ้งซ่อม");
        worksheet.columns = [
            { header: "เลขที่คำร้อง", key: "id", width: 22 },
            { header: "ชื่ออุปกรณ์", key: "deviceName", width: 22 },
            { header: "อาการเสีย", key: "description", width: 40 },
            { header: "ความเร่งด่วน", key: "priority", width: 14 },
            { header: "สถานะ", key: "status", width: 16 },
            { header: "ผู้แจ้งซ่อม", key: "user", width: 20 },
            { header: "ช่างที่รับผิดชอบ", key: "tech", width: 20 },
            { header: "บันทึกการซ่อม", key: "repairNote", width: 40 },
            { header: "วันที่แจ้ง", key: "createdAt", width: 20 },
        ];
        // Header style
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
            cell.alignment = { horizontal: "center" };
        });
        requests.forEach((r) => {
            worksheet.addRow({
                id: r.id,
                deviceName: r.deviceName,
                description: r.description,
                priority: PRIORITY_TH[r.priority] ?? r.priority,
                status: STATUS_TH[r.status] ?? r.status,
                user: r.user?.name ?? "-",
                tech: r.technician?.name ?? "ยังไม่ได้มอบหมาย",
                repairNote: r.repairNote ?? "-",
                createdAt: new Date(r.createdAt).toLocaleString("th-TH"),
            });
        });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="repair-report-${Date.now()}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (error) {
        console.error("[GET /api/admin/report/export]", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
    }
});
exports.default = router;
