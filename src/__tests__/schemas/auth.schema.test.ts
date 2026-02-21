import { registerSchema, loginSchema } from "../../schemas/auth.schema";

// รหัสผ่านที่ผ่านมาตรฐาน OWASP: uppercase + lowercase + digit + special + min 8
const VALID_PASSWORD = "SecureP@ss1";

// ---------------------------------------------------------------------------
// registerSchema
// ---------------------------------------------------------------------------
describe("registerSchema", () => {
  const validPayload = {
    name: "สมชาย ใจดี",
    email: "somchai@example.com",
    password: VALID_PASSWORD,
    confirmPassword: VALID_PASSWORD,
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

  it("แปลง email เป็นตัวพิมพ์เล็กอัตโนมัติ", () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      email: "SOMCHAI@EXAMPLE.COM",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("somchai@example.com");
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

  // -----------------------------------------------------------------------
  // OWASP Password Strength Tests
  // -----------------------------------------------------------------------
  it("ปฏิเสธเมื่อ password สั้นกว่า 8 ตัวอักษร", () => {
    const shortPass = "Ab1!"; // 4 chars
    const result = registerSchema.safeParse({
      ...validPayload,
      password: shortPass,
      confirmPassword: shortPass,
    });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อ password ยาวเกิน 128 ตัวอักษร", () => {
    const longPass = "Ab1!" + "A".repeat(125); // 129 chars
    const result = registerSchema.safeParse({
      ...validPayload,
      password: longPass,
      confirmPassword: longPass,
    });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อ password ไม่มีตัวพิมพ์ใหญ่", () => {
    const pass = "secure@pass1";
    const result = registerSchema.safeParse({
      ...validPayload,
      password: pass,
      confirmPassword: pass,
    });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อ password ไม่มีตัวพิมพ์เล็ก", () => {
    const pass = "SECURE@PASS1";
    const result = registerSchema.safeParse({
      ...validPayload,
      password: pass,
      confirmPassword: pass,
    });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อ password ไม่มีตัวเลข", () => {
    const pass = "SecurePass!";
    const result = registerSchema.safeParse({
      ...validPayload,
      password: pass,
      confirmPassword: pass,
    });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อ password ไม่มีอักขระพิเศษ", () => {
    const pass = "SecurePass1";
    const result = registerSchema.safeParse({
      ...validPayload,
      password: pass,
      confirmPassword: pass,
    });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อ password และ confirmPassword ไม่ตรงกัน", () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      password:        VALID_PASSWORD,
      confirmPassword: VALID_PASSWORD + "X",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errs = result.error.flatten().fieldErrors;
      expect(errs.confirmPassword).toBeDefined();
    }
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
    email: "SOMCHAI@EXAMPLE.COM", // ควรถูกแปลงเป็น lowercase
    password: VALID_PASSWORD,
  };

  it("ผ่านเมื่อข้อมูลถูกต้อง", () => {
    const result = loginSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("แปลง email เป็นตัวพิมพ์เล็กอัตโนมัติ", () => {
    const result = loginSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("somchai@example.com");
    }
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
    const result = loginSchema.safeParse({ password: VALID_PASSWORD });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อ body ว่างเปล่า", () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

