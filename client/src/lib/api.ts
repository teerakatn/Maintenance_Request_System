import axios from "axios";
import type { ApiResponse, CreateRepairPayload, RepairRequest } from "../types/repair";
import type { AuthUser, LoginResponse } from "../types/auth";

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({ baseURL: "/api" });

// แนบ JWT token อัตโนมัติทุก request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth API ──────────────────────────────────────────────────────────────────

/** เข้าสู่ระบบ — คืน token และข้อมูล user */
export async function loginApi(
  email: string,
  password: string
): Promise<LoginResponse> {
  const { data } = await api.post<ApiResponse<LoginResponse>>("/auth/login", {
    email,
    password,
  });
  if (!data.data) throw new Error(data.message ?? "เข้าสู่ระบบไม่สำเร็จ");
  return data.data;
}

/** ดึงข้อมูล user จาก token ปัจจุบัน */
export async function getMeApi(): Promise<AuthUser> {
  const { data } = await api.get<ApiResponse<AuthUser>>("/auth/me");
  if (!data.data) throw new Error("ไม่สามารถดึงข้อมูลผู้ใช้ได้");
  return data.data;
}

// ── Repair API ────────────────────────────────────────────────────────────────

/** ดึงรายการแจ้งซ่อมของ User คนปัจจุบัน */
export async function fetchMyRepairs(): Promise<RepairRequest[]> {
  const { data } = await api.get<ApiResponse<RepairRequest[]>>("/repair/me");
  return data.data ?? [];
}

/** สร้างคำร้องแจ้งซ่อมใหม่ (รองรับ multipart/form-data สำหรับรูปภาพ) */
export async function createRepair(
  payload: CreateRepairPayload
): Promise<RepairRequest> {
  const form = new FormData();
  form.append("deviceName", payload.deviceName);
  form.append("description", payload.description);
  form.append("priority", payload.priority);
  if (payload.image) form.append("image", payload.image);

  const { data } = await api.post<ApiResponse<RepairRequest>>("/repair", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  if (!data.data) throw new Error(data.message);
  return data.data;
}


// ── Repair API ────────────────────────────────────────────────────────────────

/** ดึงรายการแจ้งซ่อมของ User คนปัจจุบัน */
export async function fetchMyRepairs(): Promise<RepairRequest[]> {
  const { data } = await api.get<ApiResponse<RepairRequest[]>>("/repair/me");
  return data.data ?? [];
}

/** สร้างคำร้องแจ้งซ่อมใหม่ (รองรับ multipart/form-data สำหรับรูปภาพ) */
export async function createRepair(
  payload: CreateRepairPayload
): Promise<RepairRequest> {
  const form = new FormData();
  form.append("deviceName", payload.deviceName);
  form.append("description", payload.description);
  form.append("priority", payload.priority);
  if (payload.image) form.append("image", payload.image);

  const { data } = await api.post<ApiResponse<RepairRequest>>("/repair", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  if (!data.data) throw new Error(data.message);
  return data.data;
}
