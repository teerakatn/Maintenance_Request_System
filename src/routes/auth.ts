import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import prisma from "../lib/prisma";
import { registerSchema, loginSchema } from "../schemas/auth.schema";

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "ข้อมูลไม่ถูกต้อง",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  // ตัด confirmPassword ออก — ไม่จำเป็นต้องส่งไปยัง DB
  const { confirmPassword: _confirm, ...userData } = parsed.data;
  const { name, email, password, role } = userData;

  try {
    // ตรวจสอบ email ซ้ำ (case-insensitive เพราะ schema.toLowerCase())
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      res.status(409).json({ success: false, message: "Email นี้ถูกใช้งานแล้ว" });
      return;
    }

    // OWASP: hash ด้วย bcrypt salt rounds = 12
    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    res.status(201).json({
      success: true,
      message: "สมัครสมาชิกสำเร็จ",
      data: user,
    });
  } catch (error) {
    console.error("[POST /api/auth/register]", error);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
  }
});


// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "ข้อมูลไม่ถูกต้อง",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // ป้องกัน User Enumeration: ทำ bcrypt dummy compare เสมอ แม้ user ไม่มีอยู่
    // เพื่อให้ response time เท่ากัน ไม่ว่า email จะถูกหรือผิด (Timing-Safe)
    const DUMMY_HASH = "$2b$12$invalidhashfortimingreasonsonlyXXXXXXXXXXX";
    let isMatch = false;
    if (user) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      await bcrypt.compare(password, DUMMY_HASH); // dummy — ไม่สนใจผลลัพธ์
    }

    if (!user || !isMatch) {
      res.status(401).json({ success: false, message: "Email หรือรหัสผ่านไม่ถูกต้อง" });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("[POST /api/auth/login] JWT_SECRET ไม่ได้ตั้งค่า");
      res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
      return;
    }

    // JWT Payload: id, email, role — expiresIn 7 วัน
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "เข้าสู่ระบบสำเร็จ",
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    });
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me — ดึงข้อมูล user ที่ login อยู่
// ---------------------------------------------------------------------------
import { authenticate } from "../middleware/auth";

router.get("/me", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "ไม่พบผู้ใช้งาน" });
      return;
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("[GET /api/auth/me]", error);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
  }
});

export default router;
