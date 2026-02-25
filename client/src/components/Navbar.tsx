import type { ReactNode } from "react";
import { useState, useMemo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { Role } from "../types/auth";

// ── Role labels & colors ──────────────────────────────────────────────────────
const ROLE_LABEL: Record<Role, string> = {
  USER:  "ผู้แจ้งซ่อม",
  TECH:  "ช่างซ่อม",
  ADMIN: "ผู้ดูแลระบบ",
};
const ROLE_COLOR: Record<Role, string> = {
  USER:  "bg-blue-100 text-blue-700",
  TECH:  "bg-amber-100 text-amber-700",
  ADMIN: "bg-purple-100 text-purple-700",
};

// ── Nav Items per Role ────────────────────────────────────────────────────────
interface NavItem { label: string; to: string; icon: ReactNode }

function navItems(role: Role): NavItem[] {
  const iconRepair = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
  const iconTools = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
  const iconAdmin = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );

  if (role === "USER") return [
    { label: "แจ้งซ่อมใหม่ / ติดตามคำร้อง", to: "/", icon: iconRepair },
  ];
  if (role === "TECH") return [
    { label: "งานที่ได้รับมอบหมาย", to: "/technician", icon: iconTools },
  ];
  // ADMIN
  return [
    { label: "จัดการคำร้อง (Admin)", to: "/admin",  icon: iconAdmin },
    { label: "แจ้งซ่อมใหม่",         to: "/",       icon: iconRepair },
  ];
}

// ── Navbar ────────────────────────────────────────────────────────────────────
export default function Navbar({ onNewRepair }: { onNewRepair?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  if (!user) return null;

  // Memoize nav items — สร้างใหม่เฉพาะเมื่อ role เปลี่ยน (JSX elements ไม่ถูกสร้างใหม่ทุก render)
  const items = useMemo(() => navItems(user.role), [user.role]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm shadow-gray-100/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow shadow-blue-200 group-hover:bg-blue-700 transition-colors">
              {/* w-4.5 h-4.5 = 18px — Tailwind v4 native shorthand */}
              <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 11-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-sm hidden sm:block">ระบบแจ้งซ่อมอุปกรณ์</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${location.pathname === item.to
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}

            {/* USER: quick "แจ้งซ่อมใหม่" action button */}
            {user.role === "USER" && onNewRepair && (
              <button
                onClick={onNewRepair}
                className="ml-2 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold
                  bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                แจ้งซ่อมใหม่
              </button>
            )}
          </nav>

          {/* Right: user menu + mobile toggle */}
          <div className="flex items-center gap-2">
            {/* User dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 hover:bg-gray-100 transition-colors"
              >
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold select-none">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-gray-900 leading-none max-w-30 truncate">{user.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLOR[user.role]}`}>
                    {ROLE_LABEL[user.role]}
                  </span>
                </div>
                <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown panel */}
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden z-40">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                      <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLOR[user.role]}`}>
                        {ROLE_LABEL[user.role]}
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      ออกจากระบบ
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile hamburger — aria-expanded บอก screen reader ว่าเมนูเปิดหรือปิด */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="เมนู"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <nav className="md:hidden pb-3 pt-1 space-y-1 border-t border-gray-100">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${location.pathname === item.to
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                  }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}

            {user.role === "USER" && onNewRepair && (
              <button
                onClick={() => { setMobileOpen(false); onNewRepair(); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                แจ้งซ่อมใหม่
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
