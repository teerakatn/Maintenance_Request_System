// ── Enums (mirror ฝั่ง backend) ──────────────────────────────────────────────
export type Priority = "LOW" | "MEDIUM" | "HIGH";

export type RequestStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "WAITING_REVIEW"
  | "COMPLETED";

// ── Entities ─────────────────────────────────────────────────────────────────
export interface RepairUser {
  id: number;
  name: string;
  email: string;
}

export interface RepairRequest {
  id: string;
  deviceName: string;
  description: string;
  priority: Priority;
  status: RequestStatus;
  imageUrl: string | null;
  repairNote: string | null;
  createdAt: string;
  updatedAt: string;
  user: RepairUser;
  technician: RepairUser | null;
}

// ── API Payloads ──────────────────────────────────────────────────────────────
export interface CreateRepairPayload {
  deviceName: string;
  description: string;
  priority: Priority;
  image?: File;
}

// ── API Response wrappers ─────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}
