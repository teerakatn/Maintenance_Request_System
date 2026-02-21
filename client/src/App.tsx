import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard           from "./pages/Dashboard";
import Login               from "./pages/Login";
import Register            from "./pages/Register";
import TechnicianDashboard from "./pages/TechnicianDashboard";
import AdminDashboard      from "./pages/AdminDashboard";
import "./index.css";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ─── Public ───────────────────────────────────────────── */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ─── USER (ผู้แจ้งซ่อม) ────────────────────────────────── */}
          <Route path="/" element={
            <ProtectedRoute allowedRoles={["USER", "ADMIN"]}>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* ─── TECH (ช่างซ่อม) ───────────────────────────────────── */}
          <Route path="/technician" element={
            <ProtectedRoute allowedRoles={["TECH", "ADMIN"]}>
              <TechnicianDashboard />
            </ProtectedRoute>
          } />

          {/* ─── ADMIN (ผู้ดูแลระบบ) ───────────────────────────────── */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Catch-all → redirect ตาม role */}
          <Route path="*" element={<RoleRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

/** Redirect ตาม role หลัง login */
function RoleRedirect() {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser) as { role: string };
      if (u.role === "TECH")  return <Navigate to="/technician" replace />;
      if (u.role === "ADMIN") return <Navigate to="/admin" replace />;
    } catch { /* ignore */ }
  }
  return <Navigate to="/" replace />;
}

