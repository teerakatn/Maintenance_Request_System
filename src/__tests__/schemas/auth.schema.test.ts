import { registerSchema, loginSchema } from "../../schemas/auth.schema";

// ---------------------------------------------------------------------------
// registerSchema
// ---------------------------------------------------------------------------
describe("registerSchema", () => {
  const validPayload = {
    name: "สมชาย ใจดี",
    email: "somchai@example.com",
    password: "123456",
    role: "USER" as const,
  };

  it("ผ่านเมื่อข้อมูลถูกต้องครบถ้วน", () => {
    const result = registerSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("สมชาย ใจดี");
      expect(result.data.role).toBe("USER");
    }
  });

  it("ใช้ค่า default role = USER เมื่อไม่ระบุ role", () => {
    const { role, ...withoutRole } = validPayload;
    const result = registerSchema.safeParse(withoutRole);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("USER");
    }
  });

  it("ยอมรับ role = TECH และ ADMIN", () => {
    for (const role of ["TECH", "ADMIN"] as const) {
      const result = registerSchema.safeParse({ ...validPayload, role });
      expect(result.success).toBe(true);
    }
  });

  it("ปฏิเสธเมื่อ name สั้นกว่า 2 ตัวอักษร", () => {
    const result = registerSchema.safeParse({ ...validPayload, name: "A" });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อ name ยาวเกิน 100 ตัวอักษร", () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      name: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อ email ไม่ถูกต้อง", () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อ email ว่างเปล่า", () => {
    const result = registerSchema.safeParse({ ...validPayload, email: "" });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อ password สั้นกว่า 6 ตัวอักษร", () => {
    const result = registerSchema.safeParse({ ...validPayload, password: "123" });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธ role ที่ไม่รู้จัก", () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      role: "SUPERADMIN",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// loginSchema
// ---------------------------------------------------------------------------
describe("loginSchema", () => {
  const validPayload = {
    email: "somchai@example.com",
    password: "123456",
  };

  it("ผ่านเมื่อข้อมูลถูกต้อง", () => {
    const result = loginSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("ปฏิเสธเมื่อ email ไม่ถูกต้อง", () => {
    const result = loginSchema.safeParse({ ...validPayload, email: "bad-email" });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อ password ว่างเปล่า", () => {
    const result = loginSchema.safeParse({ ...validPayload, password: "" });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อขาด field email", () => {
    const result = loginSchema.safeParse({ password: "123456" });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อ body ว่างเปล่า", () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
