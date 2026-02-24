import prisma from "./prisma";

/**
 * สร้าง Repair Request ID ในรูปแบบ REP-YYYYMMDD-XXXX
 * โดย XXXX คือลำดับนับต่อเนื่องของวันนั้น (0001, 0002, ...)
 *
 * ใช้ findFirst + orderBy desc เพื่อหาลำดับล่าสุดจริง แทนที่จะใช้ count (bug เดิม: ถ้าลบ record กลางวัน
 * count จะไม่ตรงกับลำดับที่สร้างไปแล้ว)
 *
 * NOTE: Caller (ใน repair.ts) ควร retry เมื่อเกิด duplicate key (P2002)
 * เพื่อป้องกัน race condition กรณี concurrent requests
 */
export async function generateRepairId(): Promise<string> {
  const today = new Date();
  const datePart = today
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, ""); // "20260221"

  const prefix = `REP-${datePart}-`;

  // หา request ล่าสุดของวันนี้เพื่อหาลำดับถัดไป
  const latest = await prisma.repairRequest.findFirst({
    where: { id: { startsWith: prefix } },
    orderBy: { id: "desc" },
    select: { id: true },
  });

  const nextSeq = latest
    ? parseInt(latest.id.slice(-4), 10) + 1
    : 1;

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}
