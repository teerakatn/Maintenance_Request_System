/**
 * prisma/seed.ts — สร้าง User ตัวอย่างสำหรับทดสอบระบบ
 *
 * รัน:  npm run seed
 *  หรือ: npx prisma db seed
 *
 * ⚠️  Script นี้ใช้ upsert — รันซ้ำได้หลายครั้งโดยไม่เกิด duplicate
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------
const SALT_ROUNDS = 12; // OWASP recommended minimum

const seedUsers = [
  // ── 1. Admin ──────────────────────────────────────────────────────────────
  {
    name:     "ผู้ดูแลระบบ (Admin)",
    email:    "admin@repair.local",
    password: "Admin@1234",  // ตรงตาม OWASP rules
    role:     "ADMIN" as const,
  },
  // ── 2. Technician ─────────────────────────────────────────────────────────
  {
    name:     "สมศักดิ์ ช่างซ่อม (Tech)",
    email:    "tech@repair.local",
    password: "Tech@1234",
    role:     "TECH" as const,
  },
  // ── 3. User (ผู้แจ้งซ่อม) ─────────────────────────────────────────────────
  {
    name:     "สมชาย ใจดี (User)",
    email:    "user@repair.local",
    password: "User@1234",
    role:     "USER" as const,
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("🌱  เริ่มต้น Seed ข้อมูลทดสอบ...\n");

  for (const u of seedUsers) {
    const hashed = await bcrypt.hash(u.password, SALT_ROUNDS);

    const created = await prisma.user.upsert({
      where:  { email: u.email },
      update: {
        // อัปเดต name/password ถ้ารันซ้ำ แต่ไม่เปลี่ยน role ที่อาจถูกแก้ไขแล้ว
        name:     u.name,
        password: hashed,
      },
      create: {
        name:     u.name,
        email:    u.email,
        password: hashed,
        role:     u.role,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    const icon = u.role === "ADMIN" ? "👑" : u.role === "TECH" ? "🔧" : "👤";
    console.log(`${icon}  [${created.role.padEnd(5)}]  ${created.email}  (ID: ${created.id})`);
  }

  console.log("\n✅  Seed สำเร็จ! ข้อมูล Login สำหรับทดสอบ:\n");
  console.log("┌─────────────────────┬────────────────────────┬────────────────┬───────┐");
  console.log("│ ชื่อ                 │ Email                  │ Password       │ Role  │");
  console.log("├─────────────────────┼────────────────────────┼────────────────┼───────┤");

  for (const u of seedUsers) {
    const namePad  = u.name.substring(0, 20).padEnd(20);
    const emailPad = u.email.padEnd(22);
    const passPad  = u.password.padEnd(14);
    const role     = u.role.padEnd(5);
    console.log(`│ ${namePad} │ ${emailPad} │ ${passPad} │ ${role} │`);
  }

  console.log("└─────────────────────┴────────────────────────┴────────────────┴───────┘");
  console.log("\n⚠️   รหัสผ่านเหล่านี้ใช้สำหรับทดสอบเท่านั้น — ห้ามใช้ใน Production!\n");
}

main()
  .catch((e) => {
    console.error("❌  Seed เกิดข้อผิดพลาด:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
