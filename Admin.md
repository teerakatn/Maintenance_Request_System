# คู่มือสร้างบัญชี Admin

> ⚠️ **ข้อควรระวัง:** Script นี้จะสร้างบัญชี Admin ที่มี password ถูก hash ด้วย bcrypt อย่างถูกต้อง  
> ห้าม commit ไฟล์ `prisma/create-admin.ts` ขึ้น Git หลังใช้งาน

---

## ขั้นตอนที่ 1 — สร้างไฟล์ Script

สร้างไฟล์ `prisma/create-admin.ts` แล้ววางโค้ดด้านล่าง:

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function createAdmin() {
  const email    = "admin@gmail.com";   // ← เปลี่ยนเป็น Email ที่ต้องการ
  const password = "Admin@1234";        // ← เปลี่ยนเป็นรหัสผ่านที่ต้องการ
  const name     = "ผู้ดูแลระบบ";      // ← เปลี่ยนเป็นชื่อที่ต้องการ

  // ตรวจสอบว่ามี Email นี้อยู่แล้วหรือไม่
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`⚠️  Email "${email}" มีอยู่แล้วในระบบ — ไม่มีการเปลี่ยนแปลง`);
    return;
  }

  // Hash password ด้วย bcrypt (cost factor 12)
  const hashedPassword = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: { name, email, password: hashedPassword, role: "ADMIN" },
  });

  console.log(`✅ สร้างบัญชี Admin สำเร็จ`);
  console.log(`   ID       : ${admin.id}`);
  console.log(`   ชื่อ     : ${admin.name}`);
  console.log(`   Email    : ${admin.email}`);
  console.log(`   Role     : ${admin.role}`);
  console.log(`   Password : ${password}  ← บันทึกรหัสผ่านนี้ไว้ให้ดี!`);
}

createAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## ขั้นตอนที่ 2 — แก้ไขข้อมูล Admin

เปิดไฟล์ `prisma/create-admin.ts` แล้วแก้ไข 3 บรรทัดนี้:

```
const email    = "your-email@example.com";  // ← ใส่ Email จริง
const password = "YourStr0ng!Pass";          // ← ตั้งรหัสผ่านที่ปลอดภัย
const name     = "ชื่อผู้ดูแลระบบ";         // ← ใส่ชื่อจริง
```

### เกณฑ์รหัสผ่านที่ดี
- ความยาว **อย่างน้อย 8 ตัวอักษร**
- มี **ตัวพิมพ์ใหญ่** อย่างน้อย 1 ตัว (A-Z)
- มี **ตัวพิมพ์เล็ก** อย่างน้อย 1 ตัว (a-z)
- มี **ตัวเลข** อย่างน้อย 1 ตัว (0-9)
- มี **อักขระพิเศษ** อย่างน้อย 1 ตัว (!@#$%^&*)

---

## ขั้นตอนที่ 3 — รัน Script

เปิด Terminal ใน VS Code แล้วรันคำสั่ง:

```bash
npx ts-node prisma/create-admin.ts
```

### ผลลัพธ์ที่ควรได้:

```
✅ สร้างบัญชี Admin สำเร็จ
   ID       : 7
   ชื่อ     : ผู้ดูแลระบบ
   Email    : admin@gmail.com
   Role     : ADMIN
   Password : Admin@1234  ← บันทึกรหัสผ่านนี้ไว้ให้ดี!
```

### กรณี Email มีอยู่แล้ว:

```
⚠️  Email "admin@gmail.com" มีอยู่แล้วในระบบ — ไม่มีการเปลี่ยนแปลง
```

> ถ้าต้องการ **reset password** ของ account เดิม ให้ดูที่ไฟล์ [reset-password](#แก้ไขรหัสผ่าน-admin-ที่มีอยู่แล้ว) ด้านล่าง

---

## ขั้นตอนที่ 4 — ลบไฟล์ Script ทิ้ง (สำคัญมาก!)

```bash
del prisma\create-admin.ts
```

> ⚠️ **ต้องลบทุกครั้ง** เพื่อป้องกันการ commit password ขึ้น GitHub โดยไม่ตั้งใจ

---

## ขั้นตอนที่ 5 — ทดสอบเข้าสู่ระบบ

เปิดเบราว์เซอร์ที่ `http://localhost:5173` แล้วล็อกอินด้วย Email และ Password ที่ตั้งไว้

---

## แก้ไขรหัสผ่าน Admin ที่มีอยู่แล้ว

หากเข้าสู่ระบบไม่ได้ (401) หรือต้องการ reset password ให้สร้างไฟล์ `prisma/reset-password.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function resetPassword() {
  const email       = "admin@gmail.com";  // ← Email ของ Admin ที่ต้องการ reset
  const newPassword = "NewAdmin@1234";    // ← รหัสผ่านใหม่

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`❌ ไม่พบ user: ${email}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });

  console.log(`✅ เปลี่ยนรหัสผ่านสำเร็จ`);
  console.log(`   Email       : ${email}`);
  console.log(`   Password ใหม่: ${newPassword}`);
}

resetPassword()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

รันคำสั่ง:

```bash
npx ts-node prisma/reset-password.ts
```

จากนั้นลบไฟล์ทิ้ง:

```bash
del prisma\reset-password.ts
```

---

## สรุปคำสั่งทั้งหมด (Quick Reference)

```bash
# 1. สร้าง Admin ใหม่
npx ts-node prisma/create-admin.ts

# 2. ลบ script หลังใช้งาน (สำคัญ!)
del prisma\create-admin.ts

# 3. ตรวจสอบ user ใน database
npx prisma studio
```

---

## สาเหตุที่ต้องใช้ Script แทนการสร้างตรงใน Prisma Studio / MySQL

| วิธี | ผลลัพธ์ |
|------|--------|
| พิมพ์ password ตรงใน Prisma Studio | ❌ เก็บเป็น plain text → เข้าสู่ระบบไม่ได้ (401) |
| พิมพ์ password ตรงใน MySQL | ❌ เก็บเป็น plain text → เข้าสู่ระบบไม่ได้ (401) |
| ใช้ Script `create-admin.ts` | ✅ Hash ด้วย bcrypt อัตโนมัติ → เข้าสู่ระบบได้ปกติ |