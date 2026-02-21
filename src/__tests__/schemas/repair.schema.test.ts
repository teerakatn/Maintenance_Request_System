import { createRepairSchema, updateStatusSchema } from "../../schemas/repair.schema";

// ---------------------------------------------------------------------------
// createRepairSchema
// ---------------------------------------------------------------------------
describe("createRepairSchema", () => {
  const validPayload = {
    deviceName: "เครื่องปรับอากาศ ห้อง 301",
    description: "เปิดไม่ติด มีเสียงดังผิดปกติ กลิ่นไหม้",
    priority: "HIGH" as const,
  };

  it("ผ่านเมื่อข้อมูลถูกต้องครบถ้วน", () => {
    const result = createRepairSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deviceName).toBe("เครื่องปรับอากาศ ห้อง 301");
      expect(result.data.priority).toBe("HIGH");
    }
  });

  it("ใช้ค่า default priority = MEDIUM เมื่อไม่ระบุ priority", () => {
    const { priority, ...withoutPriority } = validPayload;
    const result = createRepairSchema.safeParse(withoutPriority);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe("MEDIUM");
    }
  });

  it("ยอมรับ priority ทุกค่าที่ถูกต้อง", () => {
    for (const priority of ["LOW", "MEDIUM", "HIGH"] as const) {
      const result = createRepairSchema.safeParse({ ...validPayload, priority });
      expect(result.success).toBe(true);
    }
  });

  it("ปฏิเสธเมื่อ deviceName ว่างเปล่า", () => {
    const result = createRepairSchema.safeParse({ ...validPayload, deviceName: "" });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อ deviceName ยาวเกิน 100 ตัวอักษร", () => {
    const result = createRepairSchema.safeParse({
      ...validPayload,
      deviceName: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อ description สั้นกว่า 10 ตัวอักษร", () => {
    const result = createRepairSchema.safeParse({
      ...validPayload,
      description: "สั้นเกิน",
    });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธ priority ที่ไม่รู้จัก", () => {
    const result = createRepairSchema.safeParse({
      ...validPayload,
      priority: "URGENT",
    });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อขาด deviceName", () => {
    const { deviceName, ...withoutDevice } = validPayload;
    const result = createRepairSchema.safeParse(withoutDevice);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateStatusSchema
// ---------------------------------------------------------------------------
describe("updateStatusSchema", () => {
  it("ผ่านเมื่อระบุ status ที่ถูกต้อง", () => {
    const result = updateStatusSchema.safeParse({ status: "IN_PROGRESS" });
    expect(result.success).toBe(true);
  });

  it("ผ่านพร้อม repairNote และ remark ที่ optional", () => {
    const result = updateStatusSchema.safeParse({
      status: "COMPLETED",
      repairNote: "เปลี่ยนคอมเพรสเซอร์ใหม่",
      remark: "รับประกัน 6 เดือน",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.repairNote).toBe("เปลี่ยนคอมเพรสเซอร์ใหม่");
    }
  });

  it("ยอมรับ status ทุกค่าที่ถูกต้อง", () => {
    for (const status of ["PENDING", "IN_PROGRESS", "WAITING_REVIEW", "COMPLETED"] as const) {
      const result = updateStatusSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("ปฏิเสธ status ที่ไม่รู้จัก", () => {
    const result = updateStatusSchema.safeParse({ status: "UNKNOWN_STATUS" });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อขาด status", () => {
    const result = updateStatusSchema.safeParse({ repairNote: "หมายเหตุ" });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อ repairNote ยาวเกิน 1000 ตัวอักษร", () => {
    const result = updateStatusSchema.safeParse({
      status: "COMPLETED",
      repairNote: "A".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อ remark ยาวเกิน 500 ตัวอักษร", () => {
    const result = updateStatusSchema.safeParse({
      status: "COMPLETED",
      remark: "A".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});
