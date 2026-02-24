import prisma from "./prisma";

// ---------------------------------------------------------------------------
// Auto-Assign — มอบหมายงานให้ช่างอัตโนมัติ (least-loaded)
// เลือกช่างที่มีงาน active (ยังไม่ COMPLETED) น้อยที่สุด
// ถ้ามีช่างหลายคนจำนวนงานเท่ากัน จะเลือกตาม id น้อยที่สุด (round-robin เบื้องต้น)
// ---------------------------------------------------------------------------

export interface AssignedTech {
  id: number;
  name: string;
  email: string;
}

/**
 * หา technician ที่ควรได้รับมอบหมายงานใหม่
 * @returns ข้อมูลช่างที่ถูกเลือก หรือ null หากไม่มีช่างในระบบ
 */
export async function findLeastLoadedTech(): Promise<AssignedTech | null> {
  // ดึงช่างทั้งหมดพร้อมนับจำนวนงาน active
  const techs = await prisma.user.findMany({
    where: { role: "TECH" },
    select: {
      id: true,
      name: true,
      email: true,
      _count: {
        select: {
          assignedRequests: {
            where: {
              status: { not: "COMPLETED" },
            },
          },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  if (techs.length === 0) return null;

  // เลือกช่างที่มีงาน active น้อยที่สุด
  let leastLoaded = techs[0]!;
  for (const tech of techs) {
    if (tech._count.assignedRequests < leastLoaded._count.assignedRequests) {
      leastLoaded = tech;
    }
  }

  return {
    id: leastLoaded.id,
    name: leastLoaded.name,
    email: leastLoaded.email,
  };
}
