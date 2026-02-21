// Mock Prisma ก่อน import generateRepairId เพื่อป้องกัน DB connection
jest.mock("../../lib/prisma", () => ({
  __esModule: true,
  default: {
    repairRequest: {
      count: jest.fn(),
    },
  },
}));

import prisma from "../../lib/prisma";
import { generateRepairId } from "../../lib/generateId";

const mockCount = prisma.repairRequest.count as jest.Mock;

describe("generateRepairId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("คืนค่า ID ในรูปแบบ REP-YYYYMMDD-XXXX", async () => {
    mockCount.mockResolvedValueOnce(0);
    const id = await generateRepairId();
    expect(id).toMatch(/^REP-\d{8}-\d{4}$/);
  });

  it("ลำดับเริ่มต้นที่ 0001 เมื่อยังไม่มี request ในวันนั้น", async () => {
    mockCount.mockResolvedValueOnce(0); // ยังไม่มีงานในวันนี้
    const id = await generateRepairId();
    expect(id).toMatch(/REP-\d{8}-0001$/);
  });

  it("ลำดับเป็น 0005 เมื่อมี 4 request อยู่แล้วในวันนี้", async () => {
    mockCount.mockResolvedValueOnce(4);
    const id = await generateRepairId();
    expect(id).toMatch(/REP-\d{8}-0005$/);
  });

  it("ส่วน date ตรงกับวันปัจจุบัน (YYYYMMDD)", async () => {
    mockCount.mockResolvedValueOnce(0);
    const id = await generateRepairId();
    const today = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, ""); // "20260221"
    expect(id).toContain(`REP-${today}-`);
  });

  it("เรียก prisma.repairRequest.count ด้วย prefix ของวันนี้", async () => {
    mockCount.mockResolvedValueOnce(0);
    await generateRepairId();
    const today = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");
    expect(mockCount).toHaveBeenCalledWith({
      where: { id: { startsWith: `REP-${today}-` } },
    });
  });

  it("รองรับลำดับสูง (0100)", async () => {
    mockCount.mockResolvedValueOnce(99);
    const id = await generateRepairId();
    expect(id).toMatch(/REP-\d{8}-0100$/);
  });
});
