import { z } from "zod";
import { Priority, RequestStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// POST /api/repair — สร้างคำร้องแจ้งซ่อม
// ---------------------------------------------------------------------------
export const createRepairSchema = z.object({
  deviceName: z
    .string({ error: "กรุณาระบุชื่ออุปกรณ์" })
    .min(1, "ชื่ออุปกรณ์ต้องไม่เว้นว่าง")
    .max(100, "ชื่ออุปกรณ์ยาวเกิน 100 ตัวอักษร"),

  description: z
    .string({ error: "กรุณาระบุอาการเสีย" })
    .min(10, "อาการเสียต้องมีความยาวอย่างน้อย 10 ตัวอักษร"),

  priority: z
    .nativeEnum(Priority, {
      error: `ระดับความเร่งด่วนต้องเป็น: ${Object.values(Priority).join(", ")}`,
    })
    .default(Priority.MEDIUM),
});

export type CreateRepairInput = z.infer<typeof createRepairSchema>;

// ---------------------------------------------------------------------------
// PATCH /api/repair/:id/status — อัปเดตสถานะ (สำหรับช่าง)
// ---------------------------------------------------------------------------
export const updateStatusSchema = z.object({
  status: z.nativeEnum(RequestStatus, {
    error: `สถานะต้องเป็น: ${Object.values(RequestStatus).join(", ")}`,
  }),

  repairNote: z.string().max(1000, "บันทึกยาวเกิน 1,000 ตัวอักษร").optional(),

  remark: z.string().max(500, "หมายเหตุยาวเกิน 500 ตัวอักษร").optional(),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
