import prisma from "./prisma";

/**
 * สร้าง Repair Request ID ในรูปแบบ REP-YYYYMMDD-XXXX
 * โดย XXXX คือลำดับนับต่อเนื่องของวันนั้น (0001, 0002, ...)
 */
export async function generateRepairId(): Promise<string> {
  const today = new Date();
  const datePart = today
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, ""); // "20260221"

  const prefix = `REP-${datePart}-`;

  // นับจำนวน request ในวันนี้
  const count = await prisma.repairRequest.count({
    where: {
      id: { startsWith: prefix },
    },
  });

  const sequence = String(count + 1).padStart(4, "0"); // "0001"
  return `${prefix}${sequence}`;
}
