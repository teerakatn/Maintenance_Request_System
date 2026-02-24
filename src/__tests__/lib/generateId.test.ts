// Mock Prisma ก่อน import generateRepairId เพื่อป้องกัน DB connection
jest.mock("../../lib/prisma", () => ({
  __esModule: true,
  default: {
    repairRequest: {
      findFirst: jest.fn(),
    },
  },
}));

import prisma from "../../lib/prisma";
import { generateRepairId } from "../../lib/generateId";

const mockFindFirst = prisma.repairRequest.findFirst as jest.Mock;

describe("generateRepairId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const todayStr = () =>
    new Date().toISOString().slice(0, 10).replace(/-/g, "");

  it("คืนค่า ID ในรูปแบบ REP-YYYYMMDD-XXXX", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    const id = await generateRepairId();
    expect(id).toMatch(/^REP-\d{8}-\d{4}$/);
  });

  it("ลำดับเริ่มต้นที่ 0001 เมื่อยังไม่มี request ในวันนั้น", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    const id = await generateRepairId();
    expect(id).toMatch(/REP-\d{8}-0001$/);
  });

  it("ลำดับเป็น 0005 เมื่อ request ล่าสุดคือ 0004", async () => {
    const today = todayStr();
    mockFindFirst.mockResolvedValueOnce({ id: `REP-${today}-0004` });
    const id = await generateRepairId();
    expect(id).toMatch(/REP-\d{8}-0005$/);
  });

  it("ส่วน date ตรงกับวันปัจจุบัน (YYYYMMDD)", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    const id = await generateRepairId();
    const today = todayStr();
    expect(id).toContain(`REP-${today}-`);
  });

  it("เรียก prisma.repairRequest.findFirst ด้วย prefix ของวันนี้ + orderBy desc", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    await generateRepairId();
    const today = todayStr();
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: { startsWith: `REP-${today}-` } },
      orderBy: { id: "desc" },
      select: { id: true },
    });
  });

  it("รองรับลำดับสูง (0100)", async () => {
    const today = todayStr();
    mockFindFirst.mockResolvedValueOnce({ id: `REP-${today}-0099` });
    const id = await generateRepairId();
    expect(id).toMatch(/REP-\d{8}-0100$/);
  });
});
