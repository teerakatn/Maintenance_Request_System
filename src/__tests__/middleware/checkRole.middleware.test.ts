import { Request, Response, NextFunction } from "express";
import { checkRole } from "../../middleware/checkRole";
import { JwtPayload } from "../../middleware/auth";

function mockReqResNext(user?: JwtPayload) {
  const req = { user } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

describe("checkRole middleware", () => {
  it("คืน 401 เมื่อ req.user ไม่มี (ไม่ได้เรียก authenticate ก่อน)", () => {
    const { req, res, next } = mockReqResNext(undefined);
    checkRole("USER")(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("คืน 403 เมื่อ user มี role ที่ไม่ได้รับอนุญาต", () => {
    const { req, res, next } = mockReqResNext({
      id: 1,
      email: "user@test.com",
      role: "USER",
    });
    checkRole("ADMIN")(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("เรียก next() เมื่อ user มี role ที่ถูกต้อง (single role)", () => {
    const { req, res, next } = mockReqResNext({
      id: 1,
      email: "user@test.com",
      role: "USER",
    });
    checkRole("USER")(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("เรียก next() เมื่อ user เป็น ADMIN ซึ่งอยู่ในหลาย roles", () => {
    const { req, res, next } = mockReqResNext({
      id: 2,
      email: "admin@test.com",
      role: "ADMIN",
    });
    checkRole("USER", "ADMIN")(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("เรียก next() สำหรับ TECH เมื่ออนุญาต TECH", () => {
    const { req, res, next } = mockReqResNext({
      id: 3,
      email: "tech@test.com",
      role: "TECH",
    });
    checkRole("TECH")(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("คืน 403 เมื่อ USER พยายามเข้า TECH-only route", () => {
    const { req, res, next } = mockReqResNext({
      id: 1,
      email: "user@test.com",
      role: "USER",
    });
    checkRole("TECH")(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("message ใน 403 ระบุ role ที่ต้องการและ role ของ user ปัจจุบัน", () => {
    const { req, res, next } = mockReqResNext({
      id: 1,
      email: "user@test.com",
      role: "USER",
    });
    checkRole("TECH", "ADMIN")(req, res, next);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("USER"),
      })
    );
  });
});
