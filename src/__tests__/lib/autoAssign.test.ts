// ต้อง mock ก่อน import
jest.mock("../../lib/prisma", () => ({
  __esModule: true,
  default: {
    user: { findMany: jest.fn() },
  },
}));

import prisma from "../../lib/prisma";
import { findLeastLoadedTech } from "../../lib/autoAssign";

describe("findLeastLoadedTech", () => {
  beforeEach(() => jest.clearAllMocks());

  it("คืน null เมื่อไม่มีช่างในระบบ", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([]);

    const result = await findLeastLoadedTech();
    expect(result).toBeNull();
  });

  it("คืนช่างที่มีงาน active น้อยที่สุด", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([
      { id: 1, name: "ช่าง A", email: "a@test.com", _count: { assignedRequests: 3 } },
      { id: 2, name: "ช่าง B", email: "b@test.com", _count: { assignedRequests: 1 } },
      { id: 3, name: "ช่าง C", email: "c@test.com", _count: { assignedRequests: 5 } },
    ]);

    const result = await findLeastLoadedTech();
    expect(result).toEqual({ id: 2, name: "ช่าง B", email: "b@test.com" });
  });

  it("คืนช่างคนแรกเมื่อทุกคนมีงานเท่ากัน (id น้อยสุด)", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([
      { id: 10, name: "ช่าง A", email: "a@test.com", _count: { assignedRequests: 2 } },
      { id: 20, name: "ช่าง B", email: "b@test.com", _count: { assignedRequests: 2 } },
    ]);

    const result = await findLeastLoadedTech();
    expect(result).toEqual({ id: 10, name: "ช่าง A", email: "a@test.com" });
  });

  it("คืนช่างคนเดียวเมื่อมีช่างแค่ 1 คน", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([
      { id: 5, name: "ช่างเดี่ยว", email: "solo@test.com", _count: { assignedRequests: 10 } },
    ]);

    const result = await findLeastLoadedTech();
    expect(result).toEqual({ id: 5, name: "ช่างเดี่ยว", email: "solo@test.com" });
  });
});
