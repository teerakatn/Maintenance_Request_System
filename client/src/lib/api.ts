import axios from "axios";
import type { ApiResponse, CreateRepairPayload, RepairRequest } from "../types/repair";
import type { AuthUser, LoginResponse, RegisterPayload, RegisterResponse } from "../types/auth";

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({ baseURL: "/api" });

// แนบ JWT token อัตโนมัติทุก request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth API ──────────────────────────────────────────────────────────────────

/** สมัครสมาชิก */
export async function registerApi(
  payload: RegisterPayload
): Promise<RegisterResponse> {
  const { data } = await api.post<ApiResponse<RegisterResponse>>("/auth/register", payload);
  if (!data.data) throw new Error(data.message ?? "สมัครสมาชิกไม่สำเร็จ");
  return data.data;
}

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

// ── Technician API ────────────────────────────────────────────────────────────

/** ดึงรายการงานที่มอบหมายให้ช่าง */
export async function fetchAssignedJobs(status?: string): Promise<RepairRequest[]> {
  const params = status ? { status } : {};
  const { data } = await api.get<ApiResponse<RepairRequest[]>>("/tech/assigned", { params });
  return data.data ?? [];
}

/** อัปเดตสถานะคำร้อง (เฉพาะ TECH/ADMIN) */
export async function updateRepairStatus(
  id: string,
  body: { status: string; repairNote?: string; remark?: string }
): Promise<RepairRequest> {
  const { data } = await api.patch<ApiResponse<RepairRequest>>(`/repair/${id}/status`, body);
  if (!data.data) throw new Error(data.message);
  return data.data;
}

// ── Admin API ─────────────────────────────────────────────────────────────────

export interface AdminRepairFilters {
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}
export interface PaginatedResponse<T> {
  data: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

/** ดึงคำร้องทั้งหมด (Admin) */
export async function fetchAllRepairs(filters?: AdminRepairFilters): Promise<PaginatedResponse<RepairRequest>> {
  const { data } = await api.get<{ success: boolean; data: RepairRequest[]; pagination: PaginatedResponse<RepairRequest>["pagination"] }>(
    "/admin/repairs", { params: filters }
  );
  return { data: data.data ?? [], pagination: data.pagination };
}

/** ดึงรายชื่อช่างทั้งหมด */
export async function fetchTechnicians(): Promise<{ id: number; name: string; email: string }[]> {
  const { data } = await api.get<ApiResponse<{ id: number; name: string; email: string }[]>>("/admin/technicians");
  return data.data ?? [];
}

/** มอบหมายงานให้ช่าง */
export async function assignRepair(repairId: string, techId: number): Promise<RepairRequest> {
  const { data } = await api.patch<ApiResponse<RepairRequest>>(`/admin/repairs/${repairId}/assign`, { techId });
  if (!data.data) throw new Error(data.message);
  return data.data;
}

/** ดึง Admin summary stats */
export async function fetchAdminSummary(): Promise<Record<string, number>> {
  const { data } = await api.get<ApiResponse<Record<string, number>>>("/admin/report/summary");
  return data.data ?? {};
}
