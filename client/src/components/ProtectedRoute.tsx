import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { ReactNode } from "react";
import type { Role } from "../types/auth";

interface Props {
  children: ReactNode;
  /** ถ้าระบุ — เฉพาะ Role ใน list นี้เท่านั้นที่เข้าได้ */
  allowedRoles?: Role[];
  /** หน้าที่จะ redirect เมื่อ Role ไม่มีสิทธิ์ (default "/") */
  fallback?: string;
}

/**
 * ห่อ route ที่ต้อง Login ก่อนเข้า
 *  - ไม่มี token          → /login
 *  - Role ไม่มีสิทธิ์      → fallback (default "/")
 *  - ผ่านทุกเงื่อนไข       → render children
 */
export default function ProtectedRoute({ children, allowedRoles, fallback = "/" }: Props) {
  const { token, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  // ยังไม่ login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Login แล้วแต่ Role ไม่อนุญาต
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
