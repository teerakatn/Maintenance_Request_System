import express from "express";
import path from "path";

import repairRouter from "./routes/repair";

const app = express();

// ---------------------------------------------------------------------------
// Global Middleware
// ---------------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// เสิร์ฟไฟล์รูปภาพที่อัปโหลดผ่าน static
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use("/api/repair", repairRouter);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "ไม่พบเส้นทางที่ร้องขอ" });
});

// Global Error Handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    // Multer error (เช่น ไฟล์ใหญ่เกิน / ประเภทไม่ถูกต้อง)
    if (err.message) {
      res.status(400).json({ success: false, message: err.message });
      return;
    }
    console.error("[GlobalError]", err);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
  }
);

export default app;
