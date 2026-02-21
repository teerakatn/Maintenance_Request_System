"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const repair_1 = __importDefault(require("./routes/repair"));
const auth_1 = __importDefault(require("./routes/auth"));
const admin_1 = __importDefault(require("./routes/admin"));
const tech_1 = __importDefault(require("./routes/tech"));
const app = (0, express_1.default)();
// ---------------------------------------------------------------------------
// Global Middleware
// ---------------------------------------------------------------------------
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// เสิร์ฟไฟล์รูปภาพที่อัปโหลด
app.use("/uploads", express_1.default.static(path_1.default.join(process.cwd(), "uploads")));
// เสิร์ฟ React build (client/dist) — ต้อง build ก่อนด้วย `npm run build` ใน client/
const clientDist = path_1.default.join(process.cwd(), "client", "dist");
app.use(express_1.default.static(clientDist));
// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use("/api/auth", auth_1.default);
app.use("/api/repair", repair_1.default);
app.use("/api/admin", admin_1.default);
app.use("/api/tech", tech_1.default);
// ---------------------------------------------------------------------------
// Catch-all — ส่ง index.html กลับสำหรับทุก route ที่ไม่ใช่ /api
// (รองรับ React client-side routing)
// ---------------------------------------------------------------------------
app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path_1.default.join(clientDist, "index.html"));
});
// Global Error Handler
app.use((err, _req, res, _next) => {
    if (err.message) {
        res.status(400).json({ success: false, message: err.message });
        return;
    }
    console.error("[GlobalError]", err);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
});
exports.default = app;
