import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

/**
 * ห่อ route ที่ต้อง Login ก่อนเข้า
 * ถ้ายังไม่มี token → redirect ไปหน้า /login
 * รอ hydrate จาก localStorage ก่อน (isLoading)
 */
export default function ProtectedRoute({ children }: Props) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
