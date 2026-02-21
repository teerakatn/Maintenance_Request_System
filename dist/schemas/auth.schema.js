"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    name: zod_1.z
        .string({ error: "กรุณาระบุชื่อ" })
        .min(2, "ชื่อต้องมีความยาวอย่างน้อย 2 ตัวอักษร")
        .max(100),
    email: zod_1.z
        .string({ error: "กรุณาระบุ Email" })
        .email("รูปแบบ Email ไม่ถูกต้อง"),
    password: zod_1.z
        .string({ error: "กรุณาระบุรหัสผ่าน" })
        .min(6, "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร"),
    role: zod_1.z
        .enum(["USER", "TECH", "ADMIN"], {
        error: "Role ต้องเป็น USER, TECH หรือ ADMIN",
    })
        .default("USER"),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z
        .string({ error: "กรุณาระบุ Email" })
        .email("รูปแบบ Email ไม่ถูกต้อง"),
    password: zod_1.z
        .string({ error: "กรุณาระบุรหัสผ่าน" })
        .min(1, "กรุณาระบุรหัสผ่าน"),
});
