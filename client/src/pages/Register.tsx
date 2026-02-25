import { useState, type FormEvent, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// ── Password strength rules (mirrors backend OWASP schema) ───────────────────
interface Rule { label: string; test: (p: string) => boolean }

const RULES: Rule[] = [
  { label: "ความยาวอย่างน้อย 8 ตัวอักษร",  test: (p) => p.length >= 8 },
  { label: "ตัวพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว", test: (p) => /[A-Z]/.test(p) },
  { label: "ตัวพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว", test: (p) => /[a-z]/.test(p) },
  { label: "ตัวเลข (0-9) อย่างน้อย 1 ตัว",   test: (p) => /[0-9]/.test(p) },
  { label: "อักขระพิเศษ (!@#$%…) อย่างน้อย 1 ตัว", test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(p) },
];

function StrengthBar({ password }: { password: string }) {
  const passed = RULES.filter((r) => r.test(password)).length;
  const pct    = (passed / RULES.length) * 100;
  const color  = pct <= 20 ? "bg-red-400" : pct <= 60 ? "bg-amber-400" : pct <= 80 ? "bg-yellow-400" : "bg-green-500";
  const label  = pct <= 20 ? "อ่อนมาก" : pct <= 60 ? "อ่อน" : pct <= 80 ? "ปานกลาง" : "แข็งแกร่ง";

  if (!password) return null;
  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex justify-between text-xs text-gray-500">
        <span>ความแข็งแกร่งของรหัสผ่าน</span>
        <span className={`font-medium ${pct === 100 ? "text-green-600" : "text-amber-600"}`}>{label}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <ul className="grid grid-cols-1 gap-0.5">
        {RULES.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.label} className={`flex items-center gap-1.5 text-xs ${ok ? "text-green-600" : "text-gray-400"}`}>
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                {ok
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                }
              </svg>
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Field component ───────────────────────────────────────────────────────────
function Field({
  id, label, type = "text", value, onChange, placeholder, autoComplete, error, required = true,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; autoComplete?: string; error?: string; required?: boolean;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={isPassword ? (show ? "text" : "password") : type}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400
            bg-gray-50 outline-none transition
            focus:bg-white focus:ring-2 focus:ring-blue-500/20
            ${error ? "border-red-400 focus:border-red-400 focus:ring-red-500/20" : "border-gray-200 focus:border-blue-500"}
            ${isPassword ? "pr-11" : ""}
          `}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          >
            {show ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && (
        /* แสดงข้อความผิดพลาดใต้ช่อง input — ใช้ SVG แทน emoji เพื่อควบคุมขนาดได้ */
        <p className="text-xs text-red-600 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// ── Main Register Page ────────────────────────────────────────────────────────
export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  // ✅ Security: จำกัดให้สมัครได้เฉพาะ USER และ TECH เท่านั้น
  //    ADMIN ต้องถูกแก้ไขผ่าน Database โดย DBA เท่านั้น
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "", role: "USER" as "USER" | "TECH",
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);

  function set(field: keyof typeof form) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  // ── Client-side Validation ──────────────────────────────────────────────────
  function validate(): boolean {
    const errors: Partial<Record<keyof typeof form, string>> = {};
    if (form.name.trim().length < 2)    errors.name = "ชื่อต้องมีความยาวอย่างน้อย 2 ตัวอักษร";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "รูปแบบ Email ไม่ถูกต้อง";
    if (!form.email.trim())              errors.email = "กรุณาระบุ Email";

    const failedRules = RULES.filter((r) => !r.test(form.password));
    if (failedRules.length > 0)         errors.password = failedRules[0].label;
    if (form.password !== form.confirmPassword)
                                        errors.confirmPassword = "รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const loggedInUser = await register(form);
      setSuccess(true);
      // Redirect ตาม role — ป้องกัน infinite loop ของ ProtectedRoute
      const path = loggedInUser.role === "TECH" ? "/technician"
                 : loggedInUser.role === "ADMIN" ? "/admin"
                 : "/";
      setTimeout(() => navigate(path, { replace: true }), 1200);
    } catch (err: unknown) {
      // Parse backend Zod errors if available
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
        const backendErrors = axiosErr.response?.data?.errors;
        if (backendErrors) {
          const mapped: Partial<Record<string, string>> = {};
          for (const [k, v] of Object.entries(backendErrors)) {
            mapped[k] = Array.isArray(v) ? v[0] : String(v);
          }
          setFieldErrors(mapped as typeof fieldErrors);
          return;
        }
        setServerError(axiosErr.response?.data?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
      } else {
        setServerError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
      }
    } finally {
      setLoading(false);
    }
  }

  // ✅ Security: ไม่มีตัวเลือก ADMIN ในหน้าสมัครสมาชิกสาธารณะ
  const ROLE_OPTIONS: { value: "USER" | "TECH"; label: string; desc: string; icon: string }[] = [
    { value: "USER", label: "ผู้แจ้งซ่อม", desc: "แจ้งซ่อมและติดตามสถานะ", icon: "👤" },
    { value: "TECH", label: "ช่างซ่อม",   desc: "รับงานและอัปเดตผลซ่อม",  icon: "🔧" },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-200 mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 11-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">สมัครสมาชิก</h1>
          <p className="text-sm text-gray-500 mt-1">ระบบแจ้งซ่อมอุปกรณ์</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/80 border border-gray-100 px-8 py-8">
          {/* Success banner */}
          {success && (
            <div className="flex items-center gap-2.5 rounded-xl bg-green-50 border border-green-200 px-4 py-3 mb-5">
              <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-green-700">สมัครสมาชิกสำเร็จ! กำลังพาไปยังหน้าหลัก…</p>
            </div>
          )}

          {/* Server error banner */}
          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 mb-5">
              <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Name */}
            <Field id="name" label="ชื่อ-นามสกุล" value={form.name}
              onChange={set("name")} placeholder="สมชาย ใจดี"
              autoComplete="name" error={fieldErrors.name} />

            {/* Email */}
            <Field id="email" label="อีเมล" type="email" value={form.email}
              onChange={set("email")} placeholder="example@email.com"
              autoComplete="email" error={fieldErrors.email} />

            {/* Password */}
            <div>
              <Field id="password" label="รหัสผ่าน" type="password" value={form.password}
                onChange={set("password")} placeholder="••••••••"
                autoComplete="new-password" error={fieldErrors.password} />
              <StrengthBar password={form.password} />
            </div>

            {/* Confirm Password */}
            <Field id="confirmPassword" label="ยืนยันรหัสผ่าน" type="password" value={form.confirmPassword}
              onChange={set("confirmPassword")} placeholder="••••••••"
              autoComplete="new-password" error={fieldErrors.confirmPassword} />

            {/* Role */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                ประเภทผู้ใช้ <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`relative cursor-pointer rounded-xl border-2 p-3 text-center transition-all
                      ${form.role === opt.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={opt.value}
                      checked={form.role === opt.value}
                      onChange={() => setForm((p) => ({ ...p, role: opt.value as "USER" | "TECH" }))}
                      className="sr-only"
                    />
                    <div className="text-lg mb-1">{opt.icon}</div>
                    <div className={`text-xs font-semibold ${form.role === opt.value ? "text-blue-700" : "text-gray-700"}`}>
                      {opt.label}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{opt.desc}</div>
                    {form.role === opt.value && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Note: ADMIN is DB-only */}
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
              <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-amber-700">
                <span className="font-semibold">หมายเหตุ:</span> บัญชี <span className="font-semibold">ผู้ดูแลระบบ (Admin)</span> ไม่สามารถสมัครได้ผ่านหน้านี้ — ต้องให้ DBA แก้ไข Role ใน Database เท่านั้น
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-200
                hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
            {loading ? (
              /* CSS border spinner — สม่ำเสมอกับหน้า Login */
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                กำลังสมัครสมาชิก…
              </span>
            ) : "สมัครสมาชิก"}
            </button>
          </form>

          {/* Link to Login */}
          <p className="text-center text-sm text-gray-500 mt-6">
            มีบัญชีอยู่แล้ว?{" "}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
