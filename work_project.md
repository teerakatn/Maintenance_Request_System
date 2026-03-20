โปรเจคนี้คือระบบแจ้งซ่อมอุปกรณ์สำหรับองค์กรหรือหน่วยงาน โดยมีผู้ใช้งาน 3 บทบาทคือ ผู้แจ้งซ่อม, ช่างซ่อม, และผู้ดูแลระบบ ตามที่อธิบายไว้ใน README.md, PRD.md และฝั่ง route/page หลักของระบบใน routes, pages ตัวระบบมีทั้งส่วน backend สำหรับ API และ business logic กับ frontend สำหรับหน้าจอใช้งานจริง

โปรเจคนี้ทำอะไร
ระบบรองรับงานหลักดังนี้

สมัครสมาชิกและเข้าสู่ระบบ
สร้างคำร้องแจ้งซ่อม พร้อมแนบรูปอุปกรณ์เสียได้
ติดตามสถานะงานซ่อมเป็นลำดับขั้น
ให้ช่างดูงานที่ได้รับมอบหมายและอัปเดตสถานะ
ให้แอดมินดูภาพรวม มอบหมายหรือเปลี่ยนช่าง และ export รายงาน Excel
ส่งอีเมลแจ้งเตือนเมื่อมีการมอบหมายงานหรือสถานะเปลี่ยน
โครงสร้างระบบแยกชัดเจนเป็น

Backend API ใน app.ts และ routes
Frontend React ใน App.tsx และ pages
Schema ฐานข้อมูลใน schema.prisma
ขั้นตอนการทำงาน
ลำดับการทำงานหลักของระบบเป็นแบบนี้

ผู้ใช้สมัครและล็อกอิน
ฝั่ง backend มี route สมัครและล็อกอินใน auth.ts เมื่อเข้าสู่ระบบสำเร็จ ระบบจะออก JWT token กลับมา

ฝั่ง frontend เก็บ session
ใน AuthContext.tsx token และข้อมูล user ถูกเก็บใน localStorage
ใน api.ts มี Axios interceptor ที่แนบ Authorization: Bearer <token> อัตโนมัติทุก request

ผู้แจ้งซ่อมสร้างคำร้อง
หน้าผู้ใช้หลักอยู่ใน Dashboard.tsx
เมื่อกดแจ้งซ่อม ระบบจะส่งข้อมูลไป POST /api/repair ที่ repair.ts
ข้อมูลหลักที่ส่งคือ

ชื่ออุปกรณ์
อาการเสีย
ระดับความเร่งด่วน
รูปภาพแนบ
ระบบสร้างเลขคำร้องและเลือกช่างอัตโนมัติ
ใน repair.ts ระบบจะ
validate ข้อมูลด้วย Zod
สร้างเลขคำร้องผ่าน generateId.ts
หาช่างที่งาน active น้อยที่สุดผ่าน autoAssign.ts
บันทึกคำร้องลงฐานข้อมูล
ถ้ามีช่างถูกเลือก จะส่งอีเมลแจ้งงานใหม่ผ่าน email.ts
ช่างรับงานและอัปเดตสถานะ
หน้าช่างอยู่ใน TechnicianDashboard.tsx
ช่างดึงงานจาก GET /api/tech/assigned ใน tech.ts
แล้วเปลี่ยนสถานะผ่าน PATCH /api/repair/:id/status ใน repair.ts
workflow สถานะถูกบังคับเป็นลำดับนี้

PENDING
IN_PROGRESS
WAITING_REVIEW
COMPLETED
ช่างข้ามขั้นไม่ได้ เพราะ backend ตรวจ transition ไว้แล้วใน repair.ts

ผู้แจ้งซ่อมยืนยันปิดงาน
เมื่อสถานะเป็น WAITING_REVIEW ผู้แจ้งซ่อมกดยืนยันรับงานได้จากฝั่ง user dashboard
backend ใช้ PATCH /api/repair/:id/confirm ใน repair.ts เพื่อเปลี่ยนเป็น COMPLETED

แอดมินดูภาพรวมและมอบหมายงาน
หน้าฝั่งแอดมินอยู่ใน AdminDashboard.tsx
backend อยู่ใน admin.ts
แอดมินทำได้ เช่น

ดูคำร้องทั้งหมด
filter ตามสถานะ
มอบหมายหรือเปลี่ยนช่าง
ดู summary dashboard
export รายงานเป็น Excel
----------------------------------------------------

ภาษาที่ใช้พัฒนา
ภาษาหลักที่ใช้จริงในโปรเจคนี้คือ

TypeScript: ใช้ทั้ง backend และ frontend
TSX/React: ใช้ทำ UI ฝั่ง client
SQL/MySQL: ใช้เก็บข้อมูลผ่าน Prisma ORM
CSS: ใช้จัดหน้าตา โดยอิง Tailwind CSS ตาม README.md และ dependency ใน package.json
เทคโนโลยีสำคัญ

Backend: Node.js, Express, Prisma, Zod, JWT, Multer, Nodemailer
Frontend: React, React Router, Axios, Vite
Database: MySQL
Testing: Jest, Supertest
อ้างอิงจาก package.json, package.json, schema.prisma

เก็บข้อมูลอย่างไร
ระบบนี้ไม่ได้เก็บข้อมูลแบบเดียว แต่เก็บหลายส่วนตามชนิดข้อมูล

ข้อมูลธุรกิจหลักเก็บใน MySQL
กำหนด schema ใน schema.prisma
ตารางหลักคือ
users เก็บผู้ใช้
repair_requests เก็บคำร้องซ่อม
status_logs เก็บประวัติการเปลี่ยนสถานะ
ตัวอย่างสิ่งที่เก็บ

ผู้ใช้: ชื่อ, อีเมล, รหัสผ่านที่ hash แล้ว, role
คำร้อง: id, deviceName, description, priority, status, imageUrl, repairNote, userId, techId
ประวัติสถานะ: oldStatus, newStatus, remark, changedBy, changedAt
รูปภาพที่แนบไม่ได้เก็บในฐานข้อมูลโดยตรง
ไฟล์รูปถูกเก็บในโฟลเดอร์ uploads
ในฐานข้อมูลจะเก็บแค่ path เช่น imageUrl
การอัปโหลดจัดการด้วย Multer ใน repair.ts
และเซิร์ฟไฟล์ผ่าน app.ts

token การล็อกอินเก็บที่ browser
ใน AuthContext.tsx เก็บ token และ user ไว้ใน localStorage
จากนั้น api.ts จะอ่าน token มาแนบทุกครั้งที่เรียก API

รหัสผ่านไม่ได้เก็บเป็น plain text
ใน auth.ts ใช้ bcrypt hash ก่อนบันทึกลงฐานข้อมูล

สรุปสั้น ๆ คือ โปรเจคนี้เป็นระบบแจ้งซ่อมแบบ full stack ที่มี workflow ชัดเจนตั้งแต่เปิดงาน, มอบหมายช่าง, ซ่อม, รอตรวจรับ, ไปจนปิดงาน โดยใช้ TypeScript เป็นหลักทั้งสองฝั่ง ข้อมูลหลักเก็บใน MySQL ผ่าน Prisma, รูปภาพเก็บเป็นไฟล์ในโฟลเดอร์ uploads, และ session login เก็บเป็น JWT ใน browser

อธิบายเป็นแผนภาพ flow แบบง่ายสำหรับเอาไปพรีเซนต์
อธิบายแบบลงลึกเป็นรายไฟล์ว่าแต่ละส่วนในโปรเจคทำหน้าที่อะไร