# Deploy แบบลงมือทำจริง: Render + Neon

คู่มือนี้เป็นขั้นตอนแบบคัดลอกคำสั่งไปรันทีละบรรทัดได้ทันที

## 1) เตรียมโปรเจกต์ในเครื่อง

```powershell
cd C:\Maintenance_Request_System_backup_20260322_212158
node -v
npm -v
npm install
cd client
npm install
cd ..
```

## 2) สร้างฐานข้อมูลบน Neon

1. เข้า Neon และสร้างโปรเจกต์ใหม่
2. สร้าง database (เช่น `neondb`)
3. คัดลอก connection string มา 2 แบบ:
   - `DATABASE_URL` = pooled connection
   - `DIRECT_URL` = direct connection

ตัวอย่างรูปแบบ:

```text
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://USER:PASSWORD@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

## 3) สร้างไฟล์ .env สำหรับทดสอบ local

```powershell
@"
DATABASE_URL=ใส่ค่า pooled จาก Neon
DIRECT_URL=ใส่ค่า direct จาก Neon
JWT_SECRET=เปลี่ยนเป็นค่าสุ่มยาวอย่างน้อย 32 ตัวอักษร
CORS_ORIGIN=http://localhost:3000
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=test@example.com
SMTP_PASS=testpassword
SMTP_FROM=""ระบบแจ้งซ่อม"" <no-reply@repair.local>
"@ | Set-Content -Encoding utf8 .env
```

## 4) ย้าย migration เดิม (MySQL) ออก แล้วสร้าง migration PostgreSQL ใหม่

ใช้เฉพาะครั้งแรกที่ย้ายจาก MySQL ไป Neon

```powershell
Rename-Item prisma\migrations prisma\migrations_mysql_backup
New-Item -ItemType Directory prisma\migrations
npm run prisma:generate
npx prisma migrate dev --name init_postgres
npm run seed
```

## 5) ทดสอบก่อน deploy

```powershell
npm run build:all
npm start
```

เปิด `http://localhost:3000` ถ้าเข้าได้ แปลว่าพร้อม deploy

## 6) push โค้ดขึ้น GitHub

```powershell
git checkout -b deploy/render-neon
git add .
git commit -m "chore: prepare render + neon deployment"
git push -u origin deploy/render-neon
```

## 7) Deploy บน Render

### วิธี A: ใช้ render.yaml (แนะนำ)

1. Render -> New -> Blueprint
2. เลือก repo นี้
3. Render จะอ่านไฟล์ `render.yaml` อัตโนมัติ

### วิธี B: ตั้งค่าด้วยมือ

- Runtime: Node
- Build Command:

```text
npm install && cd client && npm install && npm run build && cd .. && npm run prisma:generate && npm run build
```

- Start Command:

```text
npm run start:render
```

หมายเหตุ: คำสั่ง `start:render` ในโปรเจกต์นี้จะใช้ `prisma db push` ก่อน start server เพื่อให้ deploy รอบแรกขึ้นได้ทันทีแม้ migration เดิมเป็น MySQL

## 8) ตั้งค่า Environment Variables บน Render

อย่างน้อยต้องมี:

- `DATABASE_URL` (pooled จาก Neon)
- `DIRECT_URL` (direct จาก Neon)
- `JWT_SECRET`
- `CORS_ORIGIN` = URL ของ Render app เช่น `https://your-app.onrender.com`
- `NODE_ENV` = `production`

ส่วน SMTP ถ้าไม่ใช้ email แจ้งเตือนทันที ให้ใส่ค่าทดสอบได้ก่อน

## 9) ตรวจผลหลัง deploy

1. เปิด URL จาก Render
2. ทดสอบสมัครสมาชิก/เข้าสู่ระบบ
3. สร้างคำร้องซ่อม 1 รายการ
4. ตรวจใน Neon ว่ามีข้อมูลเพิ่มในตาราง

## 10) Troubleshooting ที่เจอบ่อย

### Error: Prisma migration fail

- ตรวจว่า `DATABASE_URL` และ `DIRECT_URL` ถูกต้อง
- ตรวจว่าทั้งสอง URL มี `sslmode=require`
- โปรเจกต์นี้ใช้ `db push` บน Render; ถ้ายัง fail ให้เปิด log แล้วตรวจสิทธิ์ user ใน Neon ว่าสามารถสร้างตารางได้
- ลอง Re-deploy อีกครั้งหลังแก้ env

### Error: CORS blocked

- ตั้ง `CORS_ORIGIN` ให้ตรงกับโดเมน Render จริง
- ถ้าทดสอบ local ให้ใช้ `http://localhost:3000` หรือ origin ที่ frontend ใช้งานจริง

### Error: login ใช้งานไม่ได้หลัง deploy

- ตรวจว่า `JWT_SECRET` ถูกตั้งค่าแล้ว
- ตรวจเวลา server และ token expiry
