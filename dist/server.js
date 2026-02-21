"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fs_1 = __importDefault(require("fs"));
const app_1 = __importDefault(require("./app"));
const PORT = process.env.PORT ?? 3000;
// สร้างโฟลเดอร์ uploads/ หากยังไม่มี
if (!fs_1.default.existsSync("uploads")) {
    fs_1.default.mkdirSync("uploads");
}
app_1.default.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
