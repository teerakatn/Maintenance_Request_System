# ระบบแจ้งซ่อมอุปกรณ์ (Maintenance Request System)

ระบบแจ้งซ่อมอุปกรณ์แบบครบวงจร พัฒนาด้วย **Node.js + Express + Prisma + MySQL** (Backend) และ **React + Tailwind CSS** (Frontend)

---

## สารบัญ

- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [ความต้องการของระบบ](#ความต้องการของระบบ)
- [การติดตั้ง](#การติดตั้ง)
- [การตั้งค่า Environment Variables](#การตั้งค่า-environment-variables)
- [การสร้างฐานข้อมูล](#การสร้างฐานข้อมูล)
- [การรันระบบ](#การรันระบบ)
- [API Reference](#api-reference)
- [Role และสิทธิ์การใช้งาน](#role-และสิทธิ์การใช้งาน)

---

## โครงสร้างโปรเจกต์

```
Maintenance_Request_System/
├── client/                  # Frontend (React + Vite + Tailwind CSS)
│   └── src/
│       ├── components/      # StatusBadge, ProgressStepper, NewRepairModal
│       ├── pages/           # Dashboard
│       ├── lib/             # Axios API client
│       └── types/           # TypeScript interfaces
├── prisma/
│   ├── schema.prisma        # Database schema (MySQL)
│   └── migrations/          # Migration files
├── src/                     # Backend (Express + TypeScript)
│   ├── lib/                 # prisma.ts, generateId.ts, email.ts
│   ├── middleware/          # auth.ts, checkRole.ts
│   ├── routes/              # auth.ts, repair.ts, tech.ts, admin.ts
│   ├── schemas/             # Zod validation schemas
│   ├── app.ts               # Express app
│   └── server.ts            # Entry point
├── uploads/                 # รูปภาพที่อัปโหลด
├── .env                     # Environment variables
└── tsconfig.json
```

---

## ความต้องการของระบบ

| เครื่องมือ | เวอร์ชันที่แนะนำ |
|-----------|----------------|
| Node.js   | v18 ขึ้นไป      |
| MySQL     | v8.0 ขึ้นไป     |
| npm       | v9 ขึ้นไป       |

---

## การติดตั้ง

### 1. ติดตั้ง dependencies ของ Backend

```bash
npm install
```

### 2. ติดตั้ง dependencies ของ Frontend

```bash
cd client
npm install
cd ..
```

---

## การตั้งค่า Environment Variables

แก้ไขไฟล์ `.env` ที่ root ของโปรเจกต์:

```env
# ฐานข้อมูล MySQL
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/repair_system_db"

# JWT Secret — เปลี่ยนเป็น string แบบสุ่มก่อน deploy
JWT_SECRET="your-super-secret-key"

# Port ของ Server
PORT=3000

# SMTP Email สำหรับส่ง Notification
SMTP_HOST=smtp.gmail.com      # หรือ smtp.ethereal.email สำหรับทดสอบ
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="ระบบแจ้งซ่อม" <no-reply@repair.local>
```

> **Tip:** ทดสอบ Email โดยไม่ส่งจริง → สร้าง account ฟรีที่ [https://ethereal.email](https://ethereal.email) แล้วนำ User/Pass มาใส่

---

## การสร้างฐานข้อมูล

### 1. สร้าง Database ใน MySQL

```sql
CREATE DATABASE repair_system_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. รัน Migration เพื่อสร้าง Tables

```bash
npx prisma migrate dev --name init
```

### 3. (ไม่บังคับ) เปิด Prisma Studio เพื่อดูข้อมูลในฐานข้อมูล

```bash
npx prisma studio
```

---

## การรันระบบ

### โหมด Development (แนะนำ)

เปิด **2 Terminal** พร้อมกัน:

**Terminal 1 — Backend:**
```bash
npm run dev
```
> Server รันที่ `http://localhost:3000`

**Terminal 2 — Frontend (Hot Reload):**
```bash
cd client
npm run dev
```
> Frontend รันที่ `http://localhost:5173`

---

### โหมด Production (รัน Server เดียว)

**ขั้นตอนที่ 1:** Build Frontend

```bash
npm run build:client
```

**ขั้นตอนที่ 2:** Build Backend

```bash
npm run build
```

**ขั้นตอนที่ 3:** Start Server

```bash
npm start
```
> เข้าใช้งานได้ที่ `http://localhost:3000`

หรือรวดเดียว:

```bash
npm run build:all && npm start
```

---

## API Reference

Base URL: `http://localhost:3000/api`

### Authentication

| Method | Endpoint | สิทธิ์ | คำอธิบาย |
|--------|----------|--------|----------|
| `POST` | `/auth/register` | Public | สมัครสมาชิก |
| `POST` | `/auth/login` | Public | เข้าสู่ระบบ รับ JWT Token |
| `GET`  | `/auth/me` | ทุก Role | ดูข้อมูลผู้ใช้ปัจจุบัน |

**ตัวอย่าง register:**
```json
POST /api/auth/register
{
  "name": "สมชาย ใจดี",
  "email": "somchai@example.com",
  "password": "123456",
  "role": "USER"
}
```

**ตัวอย่าง login response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJI...",
    "user": { "id": 1, "name": "สมชาย ใจดี", "role": "USER" }
  }
}
```

> นำ `token` ไปใส่ใน Header ทุก request ที่ต้อง Login:
> `Authorization: Bearer <token>`

---

### Repair Request (ผู้แจ้งซ่อม)

| Method | Endpoint | สิทธิ์ | คำอธิบาย |
|--------|----------|--------|----------|
| `POST`  | `/repair` | USER, ADMIN | สร้างคำร้องแจ้งซ่อม (รองรับแนบรูป) |
| `GET`   | `/repair/me` | USER | ดูรายการคำร้องของตัวเอง |
| `GET`   | `/repair/:id` | USER, TECH, ADMIN | ดูรายละเอียด + ประวัติสถานะ |

**ตัวอย่าง POST /repair** (multipart/form-data):
```
deviceName  : "เครื่องปรับอากาศ ห้อง 301"
description : "เปิดไม่ติด มีเสียงดังผิดปกติ"
priority    : "HIGH"
image       : (ไฟล์รูปภาพ, ไม่บังคับ)
```

---

### Technician (ช่างซ่อม)

| Method | Endpoint | สิทธิ์ | คำอธิบาย |
|--------|----------|--------|----------|
| `GET`   | `/tech/assigned` | TECH | ดูรายการงานที่ได้รับมอบหมาย |
| `GET`   | `/tech/assigned/:id` | TECH | ดูรายละเอียดงานชิ้นนั้น |
| `PATCH` | `/repair/:id/status` | TECH | อัปเดตสถานะ + บันทึกวิธีซ่อม |

**ตัวอย่าง PATCH /repair/:id/status:**
```json
{
  "status": "IN_PROGRESS",
  "repairNote": "เปลี่ยนคอมเพรสเซอร์ใหม่",
  "remark": "รอชิ้นส่วนอะไหล่ 2 วัน"
}
```

**สถานะที่รองรับ (`status`):**

| ค่า | ความหมาย |
|-----|----------|
| `PENDING` | รอดำเนินการ |
| `IN_PROGRESS` | กำลังซ่อม |
| `WAITING_REVIEW` | รอตรวจรับ |
| `COMPLETED` | เสร็จสิ้น |

---

### Admin

| Method | Endpoint | สิทธิ์ | คำอธิบาย |
|--------|----------|--------|----------|
| `GET`   | `/admin/repairs` | ADMIN | ดูคำร้องทั้งหมด (filter ได้) |
| `PATCH` | `/admin/repairs/:id/assign` | ADMIN | มอบหมายงานให้ช่าง |
| `GET`   | `/admin/technicians` | ADMIN | รายชื่อช่างทั้งหมด |
| `GET`   | `/admin/report/summary` | ADMIN | สรุป Dashboard |
| `GET`   | `/admin/report/export` | ADMIN | Export Excel (.xlsx) |

**Query Parameters สำหรับ GET /admin/repairs:**
```
?status=PENDING&priority=HIGH&page=1&limit=20
```

**ตัวอย่าง PATCH /admin/repairs/:id/assign:**
```json
{
  "techId": 3
}
```

---

## Role และสิทธิ์การใช้งาน

| Role | ผู้แจ้งซ่อม (USER) | ช่างซ่อม (TECH) | ผู้ดูแลระบบ (ADMIN) |
|------|:------------------:|:---------------:|:-------------------:|
| สมัครสมาชิก / เข้าสู่ระบบ | ✅ | ✅ | ✅ |
| แจ้งซ่อมใหม่              | ✅ | ❌ | ✅ |
| ดูคำร้องของตัวเอง          | ✅ | ❌ | ✅ |
| ดูงานที่ได้รับมอบหมาย      | ❌ | ✅ | ✅ |
| อัปเดตสถานะ / บันทึกการซ่อม | ❌ | ✅ | ✅ |
| มอบหมายงานให้ช่าง          | ❌ | ❌ | ✅ |
| ดูคำร้องทั้งหมดในระบบ      | ❌ | ❌ | ✅ |
| ดู Report / Export Excel   | ❌ | ❌ | ✅ |

---

## Unit Tests

รัน unit test ทั้งหมด (81 tests):

```bash
npm test
```

รันพร้อม coverage report:

```bash
npm run test:coverage
```

| ไฟล์ทดสอบ | ครอบคลุม |
|-----------|---------|
| `schemas/auth.schema.test.ts` | Zod validation ของ register/login |
| `schemas/repair.schema.test.ts` | Zod validation ของ createRepair/updateStatus |
| `middleware/auth.middleware.test.ts` | JWT authentication middleware |
| `middleware/checkRole.middleware.test.ts` | Role-based access control |
| `lib/generateId.test.ts` | การสร้าง Repair ID รูปแบบ REP-YYYYMMDD-XXXX |
| `routes/auth.routes.test.ts` | POST /register, POST /login, GET /me |
| `routes/repair.routes.test.ts` | GET/POST /repair, PATCH /repair/:id/status |

---

## ข้อมูลเพิ่มเติม

- รูปภาพที่อัปโหลดจะเก็บอยู่ในโฟลเดอร์ `uploads/` และเข้าถึงได้ผ่าน `/uploads/<filename>`
- ระบบจะส่ง Email อัตโนมัติทุกครั้งที่สถานะคำร้องเปลี่ยน และเมื่อมีการมอบหมายงานให้ช่าง
- เลขที่คำร้องจะถูกสร้างอัตโนมัติในรูปแบบ `REP-YYYYMMDD-XXXX` (เช่น `REP-20260221-0001`)
