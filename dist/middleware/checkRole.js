"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRole = checkRole;
/**
 * Middleware: กรองสิทธิ์ตาม Role
 * ใช้หลัง authenticate() เสมอ
 *
 * @example
 * router.post("/repair", authenticate, checkRole("USER", "ADMIN"), handler)
 */
function checkRole(...allowedRoles) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" });
            return;
        }
        if (!allowedRoles.includes(user.role)) {
            res.status(403).json({
                success: false,
                message: `สิทธิ์ไม่เพียงพอ ต้องการ: [${allowedRoles.join(", ")}] แต่คุณเป็น: ${user.role}`,
            });
            return;
        }
        next();
    };
}
