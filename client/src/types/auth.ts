export type Role = "USER" | "TECH" | "ADMIN";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role?: Role;
}

export interface RegisterResponse {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}
