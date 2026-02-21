import request from "supertest";
import jwt from "jsonwebtoken";

// ต้อง mock ก่อน import app
jest.mock("../../lib/prisma", () => ({
  __esModule: true,
  default: {
    user:          { findUnique: jest.fn() },
    repairRequest: {
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
      count:      jest.fn(),
    },
    statusLog:     { create: jest.fn() },
    $transaction:  jest.fn(),
  },
}));

jest.mock("../../lib/email", () => ({
  sendStatusChangedEmail: jest.fn().mockResolvedValue(undefined),
  sendAssignedEmail:      jest.fn().mockResolvedValue(undefined),
}));

// mock bcryptjs (ใช้โดย auth route ที่ถูก import ใน app)
jest.mock("bcryptjs", () => ({
  hash:    jest.fn().mockResolvedValue("hashed_password_mock"),
  compare: jest.fn(),
}));

import prisma from "../../lib/prisma";
import app   from "../../app";

const SECRET = process.env.JWT_SECRET!;

function makeToken(id = 1, role: "USER" | "TECH" | "ADMIN" = "USER") {
  return jwt.sign({ id, email: "test@test.com", role }, SECRET, {
    expiresIn: "1h",
  });
}

const fakeRepair = {
  id:          "REP-20260221-0001",
  deviceName:  "เครื่องปรับอากาศ ห้อง 301",
  description: "เปิดไม่ติด มีเสียงดังผิดปกติ",
  priority:    "HIGH",
  status:      "PENDING",
  imageUrl:    null,
  repairNote:  null,
  createdAt:   new Date().toISOString(),
  updatedAt:   new Date().toISOString(),
  user:        { id: 1, name: "สมชาย", email: "somchai@test.com" },
  technician:  null,
};

// ---------------------------------------------------------------------------
// GET /api/repair/me
// ---------------------------------------------------------------------------
describe("GET /api/repair/me", () => {
  beforeEach(() => jest.clearAllMocks());

  it("200 และคืนรายการ repair ของ user", async () => {
    (prisma.repairRequest.findMany as jest.Mock).mockResolvedValueOnce([fakeRepair]);

    const res = await request(app)
      .get("/api/repair/me")
      .set("Authorization", `Bearer ${makeToken(1, "USER")}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].id).toBe("REP-20260221-0001");
  });

  it("200 และคืน array ว่างเมื่อไม่มีคำร้อง", async () => {
    (prisma.repairRequest.findMany as jest.Mock).mockResolvedValueOnce([]);

    const res = await request(app)
      .get("/api/repair/me")
      .set("Authorization", `Bearer ${makeToken(1, "USER")}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("401 เมื่อไม่มี token", async () => {
    const res = await request(app).get("/api/repair/me");
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/repair/:id
// ---------------------------------------------------------------------------
describe("GET /api/repair/:id", () => {
  beforeEach(() => jest.clearAllMocks());

  const fakeRepairWithLogs = {
    ...fakeRepair,
    userId:     1,
    techId:     null,
    statusLogs: [
      {
        id:          1,
        requestId:   "REP-20260221-0001",
        oldStatus:   null,
        newStatus:   "PENDING",
        remark:      null,
        changedAt:   new Date().toISOString(),
        changedByUser: { id: 1, name: "สมชาย", role: "USER" },
      },
    ],
  };

  it("200 และคืนรายละเอียด + statusLogs", async () => {
    (prisma.repairRequest.findUnique as jest.Mock).mockResolvedValueOnce(
      fakeRepairWithLogs
    );

    const res = await request(app)
      .get("/api/repair/REP-20260221-0001")
      .set("Authorization", `Bearer ${makeToken(1, "USER")}`);

    expect(res.status).toBe(200);
    expect(res.body.data.statusLogs).toBeDefined();
    expect(Array.isArray(res.body.data.statusLogs)).toBe(true);
  });

  it("404 เมื่อไม่พบคำร้อง", async () => {
    (prisma.repairRequest.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const res = await request(app)
      .get("/api/repair/REP-NOTEXIST-0000")
      .set("Authorization", `Bearer ${makeToken(1, "USER")}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("403 เมื่อ USER พยายามดูคำร้องของ user คนอื่น", async () => {
    (prisma.repairRequest.findUnique as jest.Mock).mockResolvedValueOnce({
      ...fakeRepairWithLogs,
      userId: 99, // เป็นของ user id=99 ไม่ใช่ id=1
    });

    const res = await request(app)
      .get("/api/repair/REP-20260221-0001")
      .set("Authorization", `Bearer ${makeToken(1, "USER")}`); // token ของ id=1

    expect(res.status).toBe(403);
  });

  it("TECH สามารถดูคำร้องใดก็ได้", async () => {
    (prisma.repairRequest.findUnique as jest.Mock).mockResolvedValueOnce({
      ...fakeRepairWithLogs,
      userId: 99, // คนละ user กับ TECH
    });

    const res = await request(app)
      .get("/api/repair/REP-20260221-0001")
      .set("Authorization", `Bearer ${makeToken(5, "TECH")}`);

    expect(res.status).toBe(200);
  });

  it("401 เมื่อไม่มี token", async () => {
    const res = await request(app).get("/api/repair/REP-20260221-0001");
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/repair
// ---------------------------------------------------------------------------
describe("POST /api/repair", () => {
  beforeEach(() => jest.clearAllMocks());

  const validBody = {
    deviceName:  "คอมพิวเตอร์ห้องประชุม",
    description: "เปิดไม่ติดต้องกดปุ่มหลายครั้ง",
    priority:    "MEDIUM",
  };

  it("201 เมื่อสร้างคำร้องสำเร็จ", async () => {
    (prisma.repairRequest.count as jest.Mock).mockResolvedValueOnce(0);
    (prisma.repairRequest.create as jest.Mock).mockResolvedValueOnce({
      ...fakeRepair,
      id:         "REP-20260221-0001",
      deviceName: validBody.deviceName,
      priority:   "MEDIUM",
    });

    const res = await request(app)
      .post("/api/repair")
      .set("Authorization", `Bearer ${makeToken(1, "USER")}`)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deviceName).toBe(validBody.deviceName);
  });

  it("400 เมื่อ deviceName ว่าง", async () => {
    const res = await request(app)
      .post("/api/repair")
      .set("Authorization", `Bearer ${makeToken(1, "USER")}`)
      .send({ ...validBody, deviceName: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("400 เมื่อ description สั้นกว่า 10 ตัวอักษร", async () => {
    const res = await request(app)
      .post("/api/repair")
      .set("Authorization", `Bearer ${makeToken(1, "USER")}`)
      .send({ ...validBody, description: "สั้นไป" });

    expect(res.status).toBe(400);
  });

  it("401 เมื่อไม่มี token", async () => {
    const res = await request(app).post("/api/repair").send(validBody);
    expect(res.status).toBe(401);
  });

  it("403 เมื่อ TECH พยายามสร้างคำร้อง (role ไม่ถูกต้อง)", async () => {
    const res = await request(app)
      .post("/api/repair")
      .set("Authorization", `Bearer ${makeToken(5, "TECH")}`)
      .send(validBody);

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/repair/:id/status
// ---------------------------------------------------------------------------
describe("PATCH /api/repair/:id/status", () => {
  beforeEach(() => jest.clearAllMocks());

  const existingRepair = {
    ...fakeRepair,
    id:     "REP-20260221-0001",
    userId: 1,
    techId: 5, // assigned ให้ TECH id=5 แล้ว
    status: "PENDING",
    user:   { email: "somchai@test.com", name: "สมชาย" },
  };

  const updatedRepair = {
    id:         "REP-20260221-0001",
    deviceName: "เครื่องปรับอากาศ",
    status:     "IN_PROGRESS",
    repairNote: null,
    updatedAt:  new Date().toISOString(),
    technician: { id: 5, name: "ช่าง A" },
  };

  it("200 เมื่อ TECH อัปเดตสถานะของงานตัวเอง", async () => {
    (prisma.repairRequest.findUnique as jest.Mock).mockResolvedValueOnce(
      existingRepair
    );
    (prisma.$transaction as jest.Mock).mockResolvedValueOnce([updatedRepair, {}]);

    const res = await request(app)
      .patch("/api/repair/REP-20260221-0001/status")
      .set("Authorization", `Bearer ${makeToken(5, "TECH")}`)
      .send({ status: "IN_PROGRESS" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("IN_PROGRESS");
  });

  it("404 เมื่อไม่พบคำร้อง", async () => {
    (prisma.repairRequest.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const res = await request(app)
      .patch("/api/repair/REP-NOTEXIST-0000/status")
      .set("Authorization", `Bearer ${makeToken(5, "TECH")}`)
      .send({ status: "IN_PROGRESS" });

    expect(res.status).toBe(404);
  });

  it("403 เมื่อ TECH พยายามอัปเดตงานที่ไม่ใช่ของตัวเอง", async () => {
    (prisma.repairRequest.findUnique as jest.Mock).mockResolvedValueOnce({
      ...existingRepair,
      techId: 99, // assigned ให้ TECH id=99 ไม่ใช่ id=5
    });

    const res = await request(app)
      .patch("/api/repair/REP-20260221-0001/status")
      .set("Authorization", `Bearer ${makeToken(5, "TECH")}`) // TECH id=5
      .send({ status: "IN_PROGRESS" });

    expect(res.status).toBe(403);
  });

  it("400 เมื่อ status ไม่ถูกต้อง", async () => {
    const res = await request(app)
      .patch("/api/repair/REP-20260221-0001/status")
      .set("Authorization", `Bearer ${makeToken(5, "TECH")}`)
      .send({ status: "INVALID_STATUS" });

    expect(res.status).toBe(400);
  });

  it("401 เมื่อไม่มี token", async () => {
    const res = await request(app)
      .patch("/api/repair/REP-20260221-0001/status")
      .send({ status: "IN_PROGRESS" });

    expect(res.status).toBe(401);
  });

  it("403 เมื่อ USER พยายามอัปเดตสถานะ (role ไม่ถูกต้อง)", async () => {
    const res = await request(app)
      .patch("/api/repair/REP-20260221-0001/status")
      .set("Authorization", `Bearer ${makeToken(1, "USER")}`)
      .send({ status: "IN_PROGRESS" });

    expect(res.status).toBe(403);
  });

  it("ADMIN สามารถอัปเดตสถานะของทุกงานได้", async () => {
    (prisma.repairRequest.findUnique as jest.Mock).mockResolvedValueOnce({
      ...existingRepair,
      techId: null, // ยังไม่ assign
    });
    (prisma.$transaction as jest.Mock).mockResolvedValueOnce([updatedRepair, {}]);

    const res = await request(app)
      .patch("/api/repair/REP-20260221-0001/status")
      .set("Authorization", `Bearer ${makeToken(1, "ADMIN")}`)
      .send({ status: "COMPLETED" });

    expect(res.status).toBe(200);
  });
});
