import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string({ error: "กรุณาระบุชื่อ" })
    .min(2, "ชื่อต้องมีความยาวอย่างน้อย 2 ตัวอักษร")
    .max(100),

  email: z
    .string({ error: "กรุณาระบุ Email" })
    .email("รูปแบบ Email ไม่ถูกต้อง"),

  password: z
    .string({ error: "กรุณาระบุรหัสผ่าน" })
    .min(6, "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร"),

  role: z
    .enum(["USER", "TECH", "ADMIN"], {
      error: "Role ต้องเป็น USER, TECH หรือ ADMIN",
    })
    .default("USER"),
});

export const loginSchema = z.object({
  email: z
    .string({ error: "กรุณาระบุ Email" })
    .email("รูปแบบ Email ไม่ถูกต้อง"),

  password: z
    .string({ error: "กรุณาระบุรหัสผ่าน" })
    .min(1, "กรุณาระบุรหัสผ่าน"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput    = z.infer<typeof loginSchema>;
