"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
// Singleton pattern — สร้าง PrismaClient ครั้งเดียวตลอดอายุ process
const prisma = new client_1.PrismaClient();
exports.default = prisma;
