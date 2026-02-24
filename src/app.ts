import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import repairRouter from "./routes/repair";
import authRouter   from "./routes/auth";
import adminRouter  from "./routes/admin";
import techRouter   from "./routes/tech";
import { authenticate } from "./middleware/auth";

const app = express();

// ---------------------------------------------------------------------------
// Security Middleware
// ---------------------------------------------------------------------------
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? "*",
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ---------------------------------------------------------------------------
// Global Middleware
// ---------------------------------------------------------------------------
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// เสิร์ฟไฟล์รูปภาพที่อัปโหลด (ต้อง login ก่อนเข้าถึง)
app.use("/uploads", authenticate, express.static(path.join(process.cwd(), "uploads")));

// เสิร์ฟ React build (client/dist) — ต้อง build ก่อนด้วย `npm run build` ใน client/
const clientDist = path.join(process.cwd(), "client", "dist");
app.use(express.static(clientDist));

// ---------------------------------------------------------------------------
// Rate Limiting — ป้องกัน brute-force บน auth endpoints
// ---------------------------------------------------------------------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 30,                  // จำกัด 30 requests ต่อ IP ต่อ window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "คำขอมากเกินไป กรุณาลองใหม่ภายหลัง" },
});

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use("/api/auth",   authLimiter, authRouter);
app.use("/api/repair", repairRouter);
app.use("/api/admin",  adminRouter);
app.use("/api/tech",   techRouter);

// ---------------------------------------------------------------------------
// Catch-all — ส่ง index.html กลับสำหรับทุก route ที่ไม่ใช่ /api
// (รองรับ React client-side routing)
// ---------------------------------------------------------------------------
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

// Global Error Handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (err.message) {
      res.status(400).json({ success: false, message: err.message });
      return;
    }
    console.error("[GlobalError]", err);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
  }
);

export default app;
