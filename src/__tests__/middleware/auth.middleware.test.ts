import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { authenticate } from "../../middleware/auth";

/**
 * สร้าง mock Express objects สำหรับ middleware testing
 */
function mockReqResNext(overrides?: Partial<Request>) {
  const req = {
    headers: {},
    ...overrides,
  } as unknown as Request;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  const next = jest.fn() as NextFunction;

  return { req, res, next };
}

describe("authenticate middleware", () => {
  const secret = process.env.JWT_SECRET!;

  it("คืน 401 เมื่อไม่มี Authorization header", () => {
    const { req, res, next } = mockReqResNext({ headers: {} });
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("คืน 401 เมื่อ Authorization header ไม่ได้ขึ้นต้นด้วย Bearer", () => {
    const { req, res, next } = mockReqResNext({
      headers: { authorization: "Basic dXNlcjpwYXNz" },
    });
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("คืน 401 เมื่อ token ไม่ถูกต้อง (invalid signature)", () => {
    const { req, res, next } = mockReqResNext({
      headers: { authorization: "Bearer this.is.invalid.token" },
    });
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("คืน 401 เมื่อ token หมดอายุ", () => {
    const expiredToken = jwt.sign(
      { id: 1, email: "test@test.com", role: "USER" },
      secret,
      { expiresIn: -1 } // หมดอายุทันที
    );
    const { req, res, next } = mockReqResNext({
      headers: { authorization: `Bearer ${expiredToken}` },
    });
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("เรียก next() และ set req.user เมื่อ token ถูกต้อง", () => {
    const payload = { id: 42, email: "valid@test.com", role: "USER" as const };
    const token = jwt.sign(payload, secret, { expiresIn: "1h" });

    const { req, res, next } = mockReqResNext({
      headers: { authorization: `Bearer ${token}` },
    });
    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user?.id).toBe(42);
    expect(req.user?.email).toBe("valid@test.com");
    expect(req.user?.role).toBe("USER");
  });

  it("เรียก next() สำหรับทุก role ที่ถูกต้อง (USER, TECH, ADMIN)", () => {
    for (const role of ["USER", "TECH", "ADMIN"] as const) {
      const token = jwt.sign({ id: 1, email: "t@t.com", role }, secret, {
        expiresIn: "1h",
      });
      const { req, res, next } = mockReqResNext({
        headers: { authorization: `Bearer ${token}` },
      });
      authenticate(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user?.role).toBe(role);
    }
  });
});
