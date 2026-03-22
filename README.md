# ระบบแจ้งซ่อมอุปกรณ์ (Maintenance Request System)

ระบบแจ้งซ่อมอุปกรณ์แบบครบวงจร พัฒนาด้วย **Node.js + Express + Prisma + MySQL** (Backend) และ **React + Tailwind CSS** (Frontend)

---

## สารบัญ

- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [ความต้องการของระบบ](#ความต้องการของระบบ)
- [การติดตั้ง](#การติดตั้ง)
- [Deploy บน Render + Neon](docs/DEPLOY_RENDER_NEON.md)
- [การตั้งค่า Environment Variables](#การตั้งค่า-environment-variables)
- [การสร้างฐานข้อมูล](#การสร้างฐานข้อมูล)
- [การรันระบบ](#การรันระบบ)
- [API Reference](#api-reference)
- [Role และสิทธิ์การใช้งาน](#role-และสิทธิ์การใช้งาน)
- [Production-Readiness Review](#production-readiness-review)

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

### 3. สร้างข้อมูลตัวอย่างและบัญชีผู้ใช้ (Seed)

```bash
npm run seed
```

> คำสั่งนี้จะสร้างบัญชีผู้ใช้ 3 ระดับโดยอัตโนมัติ (รันซ้ำได้ ไม่เกิด duplicate):

| ชื่อ | Email | Password | Role |
|------|-------|----------|------|
| ผู้ดูแลระบบ | `admin@repair.local` | `Admin@1234` | ADMIN |
| ช่างซ่อม | `tech@repair.local` | `Tech@1234 ` | TECH |
| ผู้แจ้งซ่อม | `user@repair.local` | `User@1234` | USER |

> ⚠️ รหัสผ่านเหล่านี้ใช้สำหรับทดสอบเท่านั้น — **ห้ามใช้ใน Production** ให้เปลี่ยนรหัสผ่านทันทีหลัง deploy

### 4. (ไม่บังคับ) เปิด Prisma Studio เพื่อดูข้อมูลในฐานข้อมูล

```bash

```
npx prisma studio
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
| `POST`  | `/repair` | USER, ADMIN | สร้างคำร้องแจ้งซ่อม (รองรับแนบรูป, **auto-assign ช่างอัตโนมัติ**) |
| `GET`   | `/repair/me` | USER | ดูรายการคำร้องของตัวเอง |
| `GET`   | `/repair/:id` | USER, TECH, ADMIN | ดูรายละเอียด + ประวัติสถานะ |
| `PATCH` | `/repair/:id/confirm` | USER (เจ้าของ) | **ยืนยันรับอุปกรณ์** — เปลี่ยนสถานะ WAITING_REVIEW → COMPLETED |

**ตัวอย่าง POST /repair** (multipart/form-data):
```
deviceName  : "เครื่องปรับอากาศ ห้อง 301"
description : "เปิดไม่ติด มีเสียงดังผิดปกติ"
priority    : "HIGH"
image       : (ไฟล์รูปภาพ, ไม่บังคับ)
```

> **🤖 Auto-Assign:** เมื่อสร้างคำร้องใหม่ ระบบจะมอบหมายงานให้ช่างที่มีงาน active (ยังไม่ COMPLETED) น้อยที่สุดโดยอัตโนมัติ ไม่ต้องรอ Admin มอบหมาย  
> หากไม่มีช่างในระบบ คำร้องจะถูกสร้างโดยไม่มีช่างรับผิดชอบ รอ Admin มอบหมายภายหลัง  
> **Admin ยังสามารถเปลี่ยนช่างผู้รับผิดชอบได้** ผ่าน `PATCH /admin/repairs/:id/assign`

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

**สถานะที่รองรับ (`status`) และลำดับการเปลี่ยนที่ถูกต้อง:**

```
PENDING → IN_PROGRESS → WAITING_REVIEW → COMPLETED
```

> ⚠️ ระบบจะปฏิเสธ (400) หากพยายามข้ามขั้นตอน เช่น PENDING → COMPLETED
> ขั้นสุดท้าย (WAITING_REVIEW → COMPLETED) ต้องทำผ่าน `/repair/:id/confirm` โดยผู้แจ้งซ่อมเท่านั้น

| ค่า | ความหมาย | ใครเปลี่ยน |
|-----|----------|------------|
| `PENDING` | รอดำเนินการ | — (สร้างอัตโนมัติ) |
| `IN_PROGRESS` | กำลังซ่อม | TECH / ADMIN |
| `WAITING_REVIEW` | รอตรวจรับ | TECH / ADMIN |
| `COMPLETED` | เสร็จสิ้น | **USER** (ยืนยันรับ) |

---

### Admin

| Method | Endpoint | สิทธิ์ | คำอธิบาย |
|--------|----------|--------|----------|
| `GET`   | `/admin/repairs` | ADMIN | ดูคำร้องทั้งหมด (filter ได้) |
| `PATCH` | `/admin/repairs/:id/assign` | ADMIN | เปลี่ยนการมอบหมายงาน (เปลี่ยนช่างจาก auto-assign ได้) |
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
| **ยืนยันรับอุปกรณ์** (WAITING_REVIEW → COMPLETED) | ✅ | ❌ | ❌ |
| ดูงานที่ได้รับมอบหมาย      | ❌ | ✅ | ✅ |
| อัปเดตสถานะ / บันทึกการซ่อม | ❌ | ✅ | ✅ |
| มอบหมายงานให้ช่างอัตโนมัติ          | ✅ | ✅ | ✅ |
| **เปลี่ยนการมอบหมายงาน** | ❌ | ❌ | ✅ |
| ดูคำร้องทั้งหมดในระบบ      | ❌ | ❌ | ✅ |
| ดู Report / Export Excel   | ❌ | ❌ | ✅ |

> **หมายเหตุด้านความปลอดภัย:** Role `ADMIN` ไม่สามารถสมัครผ่าน API สาธารณะได้ ต้องแก้ไขตรงในฐานข้อมูลโดย DBA เท่านั้น

---

## Unit Tests

รัน unit test ทั้งหมด (97 tests):

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
| `lib/autoAssign.test.ts` | Auto-assign ช่างอัตโนมัติ (least-loaded) |
| `routes/auth.routes.test.ts` | POST /register, POST /login, GET /me |
| `routes/repair.routes.test.ts` | GET/POST /repair, PATCH /repair/:id/status |

---

## ข้อมูลเพิ่มเติม

- รูปภาพที่อัปโหลดจะเก็บอยู่ในโฟลเดอร์ `uploads/` และเข้าถึงได้ผ่าน `/uploads/<filename>` (ต้อง Login ก่อน)
- ระบบจะส่ง Email อัตโนมัติทุกครั้งที่สถานะคำร้องเปลี่ยน และเมื่อมีการมอบหมายงานให้ช่าง
- เลขที่คำร้องจะถูกสร้างอัตโนมัติในรูปแบบ `REP-YYYYMMDD-XXXX` (เช่น `REP-20260221-0001`)

---

## Production-Readiness Review

> อัปเดตล่าสุด: **22 กุมภาพันธ์ 2569**  
> ผู้ตรวจสอบ: Senior Software Engineer Review (GitHub Copilot)

ส่วนนี้สรุปปัญหาทั้งหมดที่พบและแก้ไขแล้วในการทำ Production-Readiness Review รอบนี้

---

### 🐛 บั๊กที่พบและแก้ไขแล้ว

#### 1. Login crash — bcrypt hash ปลอมไม่ถูกต้อง
**ไฟล์:** `src/routes/auth.ts`

**ปัญหา:** ระบบใช้ string `"$2b$12$invalidhash..."` เป็น dummy hash เพื่อป้องกัน timing attack ตอน login ล้มเหลว แต่ `bcrypt.compare()` จะ **throw TypeError** ทันทีถ้า hash ไม่ได้รูปแบบที่ถูกต้อง ทำให้ server crash ทุกครั้งที่ login ด้วย email ที่ไม่มีในระบบ

**วิธีแก้:** สร้าง hash จริงที่ module load time ครั้งเดียว:
```ts
const DUMMY_HASH = bcrypt.hashSync("__timing_safe_dummy__", 12);
```

---

#### 2. Admin Dashboard แสดงตัวเลขสถิติเป็น 0 ทั้งหมด
**ไฟล์:** `client/src/pages/AdminDashboard.tsx`, `client/src/lib/api.ts`

**ปัญหา:** API ส่งข้อมูลกลับมาในรูป `{ counts: { total, pending, ... } }` (nested object) แต่ frontend เข้าถึงด้วย `summary["total"]` (flat access) ซึ่งได้ `undefined` → fallback เป็น `0` ทุกช่อง

**วิธีแก้:** สร้าง interface `AdminSummaryData` ที่ถูกต้องและแก้ทุก key access เป็น `summary.counts.total`, `summary.counts.pending` ฯลฯ

---

#### 3. `generateRepairId()` สร้าง ID ซ้ำได้เมื่อมีการลบ record
**ไฟล์:** `src/lib/generateId.ts`

**ปัญหา:** ใช้ `count()` เพื่อหาลำดับถัดไป ถ้าเคยสร้างไปแล้ว 5 รายการแล้วลบ 2 รายการ `count()` จะคืน `3` แต่ ID ลำดับที่ 4 และ 5 มีอยู่แล้ว → ชน → Prisma 던ก error P2002

**วิธีแก้:** เปลี่ยนเป็น `findFirst({ orderBy: { id: "desc" } })` เพื่อหา sequence สูงสุดจริงๆ แล้วบวก 1 พร้อมเพิ่ม retry loop (สูงสุด 5 ครั้ง) ในฝั่ง caller สำหรับกรณี concurrent requests

---

#### 4. สถานะข้ามขั้นตอนได้ (ไม่เป็นไปตาม PRD)
**ไฟล์:** `src/routes/repair.ts`

**ปัญหา:** PATCH `/repair/:id/status` รับ status ใดก็ได้ที่ผ่าน Zod enum ทำให้ช่างสามารถเปลี่ยนจาก `PENDING` ไป `COMPLETED` ได้โดยตรง ข้ามทุกขั้นตอนใน PRD

**วิธีแก้:** เพิ่ม `VALID_TRANSITIONS` map บังคับลำดับ PENDING → IN_PROGRESS → WAITING_REVIEW → COMPLETED คืน 400 ถ้าพยายามข้ามขั้น

---

#### 5. ไม่มี endpoint ให้ผู้แจ้งซ่อมยืนยันรับอุปกรณ์ (ขาด feature ตาม PRD)
**ไฟล์:** `src/routes/repair.ts`, `client/src/pages/Dashboard.tsx`

**ปัญหา:** PRD กำหนดว่า **ผู้แจ้งซ่อม** ต้องกดยืนยันรับอุปกรณ์คืน (ขั้นตอนที่ 4) แต่ไม่มี endpoint รองรับและไม่มีปุ่มในหน้า Dashboard

**วิธีแก้:**
- เพิ่ม endpoint `PATCH /api/repair/:id/confirm` (USER เจ้าของ request เท่านั้น)
- เพิ่มปุ่ม **"ยืนยันการรับอุปกรณ์"** สีเขียวในหน้า Dashboard เมื่อ status = `WAITING_REVIEW`

---

#### 6. Test ยืนยันว่า ADMIN สมัครผ่าน API ได้ (ผิด)
**ไฟล์:** `src/__tests__/schemas/auth.schema.test.ts`

**ปัญหา:** มี test ที่ assert ว่า role = `ADMIN` ผ่าน `registerSchema` ได้ แต่ schema ถูกต้องที่จำกัดแค่ `["USER", "TECH"]` เพื่อความปลอดภัย test จึงส่ง false positive (ตรรกะ test ผิด)

**วิธีแก้:** แยกเป็น 2 test — ยืนยันว่า TECH ผ่าน และยืนยันว่า **ADMIN ถูกปฏิเสธ**

---

### 🔒 ช่องโหว่ความปลอดภัยที่แก้ไขแล้ว

#### 7. HTML Injection ในอีเมล notification
**ไฟล์:** `src/lib/email.ts`

**ปัญหา:** ค่าที่มาจากผู้ใช้ เช่น ชื่ออุปกรณ์ (`deviceName`) ถูก interpolate ตรงๆ ใน HTML template มีความเสี่ยงที่ผู้ไม่หวังดีจะแทรก `<script>` หรือ link ฟิชชิ่งผ่านชื่ออุปกรณ์

**วิธีแก้:** เพิ่มฟังก์ชัน `escapeHtml()` ที่ escape อักขระ `& < > " '` และใช้กับทุกค่าที่มาจากผู้ใช้ก่อน render ใน template

---

#### 8. ไฟล์รูปภาพที่อัปโหลดเข้าถึงได้โดยไม่ต้อง Login
**ไฟล์:** `src/app.ts`

**ปัญหา:** `express.static("uploads")` เปิดให้เข้าถึงได้โดยไม่ต้องมี token ใครก็ตามที่รู้ชื่อไฟล์สามารถดูรูปภาพอุปกรณ์ที่แนบมากับงานซ่อมของคนอื่นได้

**วิธีแก้:** ย้าย `express.static` มาอยู่หลัง `authenticate` middleware:
```ts
app.use("/uploads", authenticate, express.static(...));
```

---

#### 9. ไม่มี CORS, Security Headers, และ Rate Limiting
**ไฟล์:** `src/app.ts`

**ปัญหา:**
- ไม่มี CORS policy → browser ส่ง cross-origin request จาก domain ใดก็ได้
- ไม่มี security headers → เสี่ยง XSS, Clickjacking, MIME sniffing
- ไม่มี rate limiting → เสี่ยง brute-force โจมตีหน้า login

**วิธีแก้:** ติดตั้งและเพิ่ม:
- `helmet()` — security headers ครบชุด
- `cors({ origin: process.env.CORS_ORIGIN })` — จำกัด origin
- `rateLimit({ windowMs: 15 นาที, max: 30 })` — จำกัดบน `/api/auth`
- `express.json({ limit: "1mb" })` — ป้องกัน payload ขนาดใหญ่

ติดตั้ง packages เพิ่ม: `cors`, `helmet`, `express-rate-limit`, `@types/cors`

---

### ⚙️ ปัญหาอื่นๆ ที่แก้ไขแล้ว

#### 10. ไม่มี Graceful Shutdown
**ไฟล์:** `src/server.ts`

**ปัญหา:** เมื่อ process ได้รับ SIGTERM (เช่น ตอน deploy ใหม่หรือ Docker stop) server จะหยุดทันทีโดยไม่รอ request ที่กำลังทำงานอยู่ให้เสร็จ และไม่ปิด database connection

**วิธีแก้:** เพิ่ม handler สำหรับ `SIGTERM` และ `SIGINT` ที่รอให้ server ปิด connection ก่อน จากนั้น `prisma.$disconnect()` และ force exit หลัง 10 วินาที

---

#### 11. Multer บันทึกไฟล์ผิดที่เมื่อ working directory เปลี่ยน
**ไฟล์:** `src/routes/repair.ts`

**ปัญหา:** `multer({ dest: "uploads/" })` ใช้ relative path ถ้ารัน server จาก directory อื่นไฟล์จะหายไปในโฟลเดอร์ผิด

**วิธีแก้:** เปลี่ยนเป็น absolute path:
```ts
path.join(process.cwd(), "uploads")
```

---

#### 12. `JSX.Element` ไม่มีใน React 19
**ไฟล์:** `client/src/components/Navbar.tsx`

**ปัญหา:** React 19 ลบ global `JSX` namespace ออก การใช้ `JSX.Element` โดยตรงทำให้ TypeScript compilation ล้มเหลว

**วิธีแก้:** เปลี่ยนเป็น `ReactNode` จาก `import type { ReactNode } from "react"`

---

#### 13. Test mocks ไม่สอดคล้องกับ implementation ที่แก้ไขแล้ว
**ไฟล์:** `src/__tests__/routes/repair.routes.test.ts`, `src/__tests__/routes/auth.routes.test.ts`

**ปัญหา:** หลังแก้ `generateRepairId()` และ `auth.ts` แล้ว:
- Mock ของ `bcryptjs` ขาด `hashSync` ทำให้ test suite เปิดไม่ได้เลย
- Mock ของ Prisma ขาด `findFirst` ทำให้ POST /repair คืน 500
- Test ส่ง `status: "COMPLETED"` จาก PENDING ซึ่งถูก reject โดย transition validation ใหม่

**วิธีแก้:** เพิ่ม `hashSync` ในทุก bcryptjs mock, เพิ่ม `findFirst` ใน Prisma mock, แก้ test ให้ส่ง status ที่ถูก transition ที่ถูกต้อง

---

### ✅ ผลลัพธ์หลังแก้ไข

| หัวข้อตรวจสอบ | ก่อน | หลัง |
|--------------|------|------|
| TypeScript compile (Backend) | ✅ | ✅ |
| TypeScript compile (Frontend) | ❌ (JSX.Element error) | ✅ |
| Unit Tests | 57 pass / 35 fail (2 suites failed) | **97 pass / 0 fail** |
| Security Headers | ❌ | ✅ (helmet) |
| CORS Policy | ❌ | ✅ |
| Rate Limiting | ❌ | ✅ |
| Graceful Shutdown | ❌ | ✅ |
| HTML Injection ในอีเมล | ❌ vulnerable | ✅ escaped |
| สิทธิ์เข้าถึงรูปภาพ | ❌ public | ✅ ต้อง login |
| Status Transition ตาม PRD | ❌ | ✅ |
| ผู้แจ้งซ่อมยืนยันรับอุปกรณ์ | ❌ ไม่มี | ✅ มีทั้ง API + UI |

### 📦 Packages ที่ติดตั้งเพิ่ม

```bash
npm install cors helmet express-rate-limit
npm install --save-dev @types/cors
```

### 💡 ข้อแนะนำเพิ่มเติมสำหรับอนาคต (ยังไม่ได้แก้)

| หัวข้อ | รายละเอียด |
|--------|----------|
| Centralized Error Handling | สร้าง `AppError` class + global error middleware แทนการ try/catch ใน route ทุกตัว |
| Structured Logging | ใช้ `winston` หรือ `pino` แทน `console.error` เพื่อ log แบบ JSON ใน production |
| Environment Validation | ใช้ Zod validate `process.env` ตอน startup เพื่อให้ fail fast แทนที่จะ crash ระหว่างรัน |
| File Upload to Cloud | ย้ายไปใช้ S3/GCS เพราะ `uploads/` local ไม่รองรับ horizontal scaling |
| Database Indexes | เพิ่ม index บน `repairRequest.status` และ `repairRequest.createdAt` |
| API Versioning | Prefix route ด้วย `/api/v1/` เพื่อรองรับการเปลี่ยน API ในอนาคตโดยไม่ breaking |
