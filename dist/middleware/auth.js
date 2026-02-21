"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * Middleware: ตรวจสอบ JWT Token จาก Authorization header
 * ต้องใช้ก่อน checkRole เสมอ
 */
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" });
        return;
    }
    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        res.status(500).json({ success: false, message: "Server configuration error" });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.user = decoded;
        next();
    }
    catch {
        res.status(401).json({ success: false, message: "Token ไม่ถูกต้องหรือหมดอายุ" });
    }
}
