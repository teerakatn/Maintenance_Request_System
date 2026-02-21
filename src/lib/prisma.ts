import { PrismaClient } from "@prisma/client";

// Singleton pattern — สร้าง PrismaClient ครั้งเดียวตลอดอายุ process
const prisma = new PrismaClient();

export default prisma;
