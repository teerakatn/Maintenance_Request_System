import request from "supertest";
import jwt from "jsonwebtoken";

// ต้อง mock ก่อน import app
jest.mock("../../lib/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    repairRequest: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    statusLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

// mock email เพื่อป้องกัน SMTP connection
jest.mock("../../lib/email", () => ({
  sendStatusChangedEmail: jest.fn(),
  sendAssignedEmail: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password_mock"),
  compare: jest.fn(),
}));

import prisma from "../../lib/prisma";
import bcrypt from "bcryptjs";
import app from "../../app";

const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockCreate     = prisma.user.create as jest.Mock;
const mockCompare    = bcrypt.compare as jest.Mock;

const SECRET = process.env.JWT_SECRET!;

// สร้าง valid token สำหรับทดสอบ GET /me
function makeToken(payload = { id: 1, email: "test@test.com", role: "USER" as const }) {
  return jwt.sign(payload, SECRET, { expiresIn: "1h" });
}

// รหัสผ่านที่ผ่านมาตรฐาน OWASP
const VALID_PASSWORD = "SecureP@ss1";

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
describe("POST /api/auth/register", () => {
  beforeEach(() => jest.clearAllMocks());

  const validBody = {
    name: "สมชาย ใจดี",
    email: "somchai@test.com",
    password: VALID_PASSWORD,
    confirmPassword: VALID_PASSWORD,
    role: "USER",
  };

  it("201 เมื่อสมัครสำเร็จ", async () => {
    mockFindUnique.mockResolvedValueOnce(null); // email ยังไม่มีในระบบ
    mockCreate.mockResolvedValueOnce({
      id: 1,
      name: validBody.name,
      email: validBody.email,
      role: "USER",
      createdAt: new Date(),
    });

    const res = await request(app).post("/api/auth/register").send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(validBody.email);
  });

  it("409 เมื่อ email ถูกใช้งานแล้ว", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 99, email: validBody.email });

    const res = await request(app).post("/api/auth/register").send(validBody);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("400 เมื่อ email ไม่ถูกต้อง", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validBody, email: "bad-email" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it("400 เมื่อ password สั้นกว่า 8 ตัวอักษร", async () => {
    const shortPass = "Ab1!";
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validBody, password: shortPass, confirmPassword: shortPass });
    expect(res.status).toBe(400);
  });

  it("400 เมื่อ password ไม่มีอักขระพิเศษ (ไม่ผ่าน OWASP)", async () => {
    const weakPass = "SecurePass1";
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validBody, password: weakPass, confirmPassword: weakPass });
    expect(res.status).toBe(400);
  });

  it("400 เมื่อ confirmPassword ไม่ตรงกับ password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validBody, confirmPassword: VALID_PASSWORD + "X" });
    expect(res.status).toBe(400);
    expect(res.body.errors?.confirmPassword).toBeDefined();
  });

  it("400 เมื่อ body ว่างเปล่า", async () => {
    const res = await request(app).post("/api/auth/register").send({});
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
describe("POST /api/auth/login", () => {
  beforeEach(() => jest.clearAllMocks());

  const validBody = { email: "somchai@test.com", password: "pass1234" };
  const fakeUser = {
    id: 1,
    name: "สมชาย",
    email: validBody.email,
    password: "hashed_password_mock",
    role: "USER" as const,
  };

  it("200 และคืน token เมื่อ login สำเร็จ", async () => {
    mockFindUnique.mockResolvedValueOnce(fakeUser);
    mockCompare.mockResolvedValueOnce(true);

    const res = await request(app).post("/api/auth/login").send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(typeof res.body.data.token).toBe("string");
  });

  it("token ที่ได้สามารถ verify ด้วย JWT_SECRET ได้", async () => {
    mockFindUnique.mockResolvedValueOnce(fakeUser);
    mockCompare.mockResolvedValueOnce(true);

    const res = await request(app).post("/api/auth/login").send(validBody);
    const decoded = jwt.verify(res.body.data.token, SECRET) as any;
    expect(decoded.id).toBe(fakeUser.id);
    expect(decoded.role).toBe("USER");
  });

  it("401 เมื่อ email ไม่พบในระบบ", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await request(app).post("/api/auth/login").send(validBody);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("401 เมื่อ password ไม่ถูกต้อง", async () => {
    mockFindUnique.mockResolvedValueOnce(fakeUser);
    mockCompare.mockResolvedValueOnce(false);

    const res = await request(app).post("/api/auth/login").send(validBody);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("400 เมื่อ email ไม่ถูกต้อง", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "bad", password: "123456" });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
describe("GET /api/auth/me", () => {
  beforeEach(() => jest.clearAllMocks());

  const fakeUser = {
    id: 1,
    name: "สมชาย",
    email: "somchai@test.com",
    role: "USER" as const,
    createdAt: new Date(),
  };

  it("200 และคืนข้อมูล user เมื่อมี valid token", async () => {
    mockFindUnique.mockResolvedValueOnce(fakeUser);

    const token = makeToken({ id: 1, email: fakeUser.email, role: "USER" });
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(fakeUser.email);
  });

  it("401 เมื่อไม่มี token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("401 เมื่อ token ไม่ถูกต้อง", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid.token.here");
    expect(res.status).toBe(401);
  });
});
