import axios from "axios";
import type { ApiResponse, CreateRepairPayload, RepairRequest } from "../types/repair";

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({ baseURL: "/api" });

// แนบ JWT token อัตโนมัติทุก request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
