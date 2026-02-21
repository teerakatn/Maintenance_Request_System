import express from "express";
import path from "path";

import repairRouter from "./routes/repair";
import authRouter   from "./routes/auth";
import adminRouter  from "./routes/admin";
import techRouter   from "./routes/tech";

const app = express();

// ---------------------------------------------------------------------------
// Global Middleware
// ---------------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// เสิร์ฟไฟล์รูปภาพที่อัปโหลด
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// เสิร์ฟ React build (client/dist) — ต้อง build ก่อนด้วย `npm run build` ใน client/
const clientDist = path.join(process.cwd(), "client", "dist");
app.use(express.static(clientDist));

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use("/api/auth",   authRouter);
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
