"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStatusSchema = exports.createRepairSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
// ---------------------------------------------------------------------------
// POST /api/repair — สร้างคำร้องแจ้งซ่อม
// ---------------------------------------------------------------------------
exports.createRepairSchema = zod_1.z.object({
    deviceName: zod_1.z
        .string({ error: "กรุณาระบุชื่ออุปกรณ์" })
        .min(1, "ชื่ออุปกรณ์ต้องไม่เว้นว่าง")
        .max(100, "ชื่ออุปกรณ์ยาวเกิน 100 ตัวอักษร"),
    description: zod_1.z
        .string({ error: "กรุณาระบุอาการเสีย" })
        .min(10, "อาการเสียต้องมีความยาวอย่างน้อย 10 ตัวอักษร"),
    priority: zod_1.z
        .nativeEnum(client_1.Priority, {
        error: `ระดับความเร่งด่วนต้องเป็น: ${Object.values(client_1.Priority).join(", ")}`,
    })
        .default(client_1.Priority.MEDIUM),
});
// ---------------------------------------------------------------------------
// PATCH /api/repair/:id/status — อัปเดตสถานะ (สำหรับช่าง)
// ---------------------------------------------------------------------------
exports.updateStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.RequestStatus, {
        error: `สถานะต้องเป็น: ${Object.values(client_1.RequestStatus).join(", ")}`,
    }),
    repairNote: zod_1.z.string().max(1000, "บันทึกยาวเกิน 1,000 ตัวอักษร").optional(),
    remark: zod_1.z.string().max(500, "หมายเหตุยาวเกิน 500 ตัวอักษร").optional(),
});
