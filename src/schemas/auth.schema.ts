import { z } from "zod";

// ---------------------------------------------------------------------------
// OWASP Password Strength Rules:
//  ✅ Minimum 8 characters
//  ✅ At least 1 uppercase letter  (A-Z)
//  ✅ At least 1 lowercase letter  (a-z)
//  ✅ At least 1 digit             (0-9)
//  ✅ At least 1 special character (!@#$%^&*...)
//  ✅ Maximum 128 characters (prevent DoS via huge hash)
// ---------------------------------------------------------------------------
const passwordSchema = z
  .string({ error: "กรุณาระบุรหัสผ่าน" })
  .min(8,   "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร")
  .max(128, "รหัสผ่านต้องมีความยาวไม่เกิน 128 ตัวอักษร")
  .refine((p) => /[A-Z]/.test(p), {
    message: "รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว (A-Z)",
  })
  .refine((p) => /[a-z]/.test(p), {
    message: "รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว (a-z)",
  })
  .refine((p) => /[0-9]/.test(p), {
    message: "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว (0-9)",
  })
  .refine((p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p), {
    message: "รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว (เช่น !@#$%)",
  });

// ---------------------------------------------------------------------------
// Register Schema
// ---------------------------------------------------------------------------
export const registerSchema = z
  .object({
    name: z
      .string({ error: "กรุณาระบุชื่อ" })
      .min(2,   "ชื่อต้องมีความยาวอย่างน้อย 2 ตัวอักษร")
      .max(100, "ชื่อต้องมีความยาวไม่เกิน 100 ตัวอักษร")
      .trim(),

    email: z
      .string({ error: "กรุณาระบุ Email" })
      .email("รูปแบบ Email ไม่ถูกต้อง")
      .max(255, "Email ต้องมีความยาวไม่เกิน 255 ตัวอักษร")
      .toLowerCase()
      .trim(),

    password: passwordSchema,

    confirmPassword: z
      .string({ error: "กรุณายืนยันรหัสผ่าน" })
      .min(1, "กรุณายืนยันรหัสผ่าน"),

    role: z
      .enum(["USER", "TECH", "ADMIN"], {
        error: "Role ต้องเป็น USER, TECH หรือ ADMIN",
      })
      .default("USER"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

// ---------------------------------------------------------------------------
// Login Schema
// ---------------------------------------------------------------------------
export const loginSchema = z.object({
  email: z
    .string({ error: "กรุณาระบุ Email" })
    .email("รูปแบบ Email ไม่ถูกต้อง")
    .toLowerCase()
    .trim(),

  password: z
    .string({ error: "กรุณาระบุรหัสผ่าน" })
    .min(1, "กรุณาระบุรหัสผ่าน"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput    = z.infer<typeof loginSchema>;
