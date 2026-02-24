import { useEffect, useState, useMemo, useCallback } from "react";
import { createRepair, fetchMyRepairs, confirmRepair } from "../lib/api";
import type { CreateRepairPayload, RepairRequest } from "../types/repair";
import NewRepairModal from "../components/NewRepairModal";
import ProgressStepper from "../components/ProgressStepper";
import StatusBadge from "../components/StatusBadge";
import Navbar from "../components/Navbar";
import { useAuth } from "../contexts/AuthContext";

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`rounded-2xl p-5 ${color} flex items-center gap-4`}>
      <p className="text-3xl font-bold">{count}</p>
      <p className="text-sm font-medium leading-tight">{label}</p>
    </div>
  );
}

// ── Priority badge ────────────────────────────────────────────────────────────
const PRIORITY_LABEL: Record<string, string> = { LOW: "ต่ำ", MEDIUM: "ปานกลาง", HIGH: "สูง" };
const PRIORITY_COLOR: Record<string, string> = {
  LOW:    "text-green-600 bg-green-50",
  MEDIUM: "text-amber-600 bg-amber-50",
  HIGH:   "text-red-600 bg-red-50",
};

// ── Expanded row ──────────────────────────────────────────────────────────────
function RepairCard({ request, onConfirm }: { request: RepairRequest; onConfirm?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all">
      {/* Card header (always visible) */}
      <button
        className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Left: image or placeholder */}
        <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
          {request.imageUrl ? (
            <img src={request.imageUrl} alt={request.deviceName} className="w-full h-full object-cover" />
          ) : (
            <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        {/* Middle: info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 truncate">{request.deviceName}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[request.priority]}`}>
              {PRIORITY_LABEL[request.priority]}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{request.id}</p>
          <p className="text-sm text-gray-600 mt-1 line-clamp-1">{request.description}</p>
        </div>

        {/* Right: status + chevron */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          <StatusBadge status={request.status} size="sm" />
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded: progress stepper */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-4 pt-4">
            แจ้งซ่อมเมื่อ {new Date(request.createdAt).toLocaleDateString("th-TH", {
              year: "numeric", month: "long", day: "numeric",
            })}
            {request.technician && ` · ช่าง: ${request.technician.name}`}
          </p>
          <ProgressStepper status={request.status} />

          {/* Repair note if available */}
          {request.repairNote && (
            <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
              <p className="text-xs font-semibold text-blue-700 mb-1">บันทึกการซ่อม</p>
              <p className="text-sm text-blue-800">{request.repairNote}</p>
            </div>
          )}

          {/* Confirm completion button — only when WAITING_REVIEW */}
          {request.status === "WAITING_REVIEW" && onConfirm && (
            <button
              disabled={confirming}
              onClick={async () => {
                setConfirming(true);
                try { await onConfirm(request.id); } finally { setConfirming(false); }
              }}
              className="mt-4 w-full rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 transition-colors"
            >
              {confirming ? "กำลังยืนยัน..." : "✓ ยืนยันการรับอุปกรณ์"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user }                  = useAuth();
  const [repairs, setRepairs]     = useState<RepairRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch]       = useState("");

  const loadRepairs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMyRepairs();
      setRepairs(data);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRepairs(); }, [loadRepairs]);

  const handleCreateRepair = useCallback(async (payload: CreateRepairPayload) => {
    const newRequest = await createRepair(payload);
    setRepairs((prev) => [newRequest, ...prev]);
  }, []);

  const handleConfirmRepair = useCallback(async (id: string) => {
    const updated = await confirmRepair(id);
    setRepairs((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
  }, []);

  // Computed stats — คำนวณใหม่เฉพาะเมื่อ repairs เปลี่ยน
  const stats = useMemo(() => ({
    total:   repairs.length,
    pending: repairs.filter((r) => r.status === "PENDING").length,
    active:  repairs.filter((r) => r.status === "IN_PROGRESS" || r.status === "WAITING_REVIEW").length,
    done:    repairs.filter((r) => r.status === "COMPLETED").length,
  }), [repairs]);

  // Filtered list — คำนวณใหม่เฉพาะเมื่อ repairs หรือ search เปลี่ยน
  const filtered = useMemo(() =>
    repairs.filter((r) =>
      search === "" ||
      r.deviceName.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase())
    ),
  [repairs, search]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ใช้ Navbar component ร่วมกัน — ส่ง onNewRepair เพื่อให้ปุ่มบน Navbar ทำงานได้ */}
      <Navbar onNewRepair={() => setShowModal(true)} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {user?.role === "ADMIN" ? "ภาพรวมระบบ (Admin)" : "คำร้องของฉัน"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">ติดตามสถานะการซ่อมและแจ้งซ่อมใหม่ได้จากที่นี่</p>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="คำร้องทั้งหมด"  count={stats.total}   color="bg-white border border-gray-100 shadow-sm text-gray-800" />
          <StatCard label="รอดำเนินการ"     count={stats.pending} color="bg-amber-50 text-amber-800" />
          <StatCard label="อยู่ระหว่างซ่อม" count={stats.active}  color="bg-blue-50 text-blue-800" />
          <StatCard label="เสร็จสิ้น"        count={stats.done}    color="bg-green-50 text-green-800" />
        </div>

        {/* Search + list header */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่ออุปกรณ์ หรือเลขที่คำร้อง..."
              className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm
                outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={loadRepairs}
            className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
            title="รีเฟรช"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-white border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-6 py-8 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <button onClick={loadRepairs} className="mt-3 text-sm text-red-500 underline">ลองใหม่</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-100 px-6 py-16 text-center">
            <svg className="mx-auto w-14 h-14 text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-500 font-medium">
              {search ? "ไม่พบคำร้องที่ตรงกับคำค้นหา" : "ยังไม่มีคำร้องแจ้งซ่อม"}
            </p>
            {!search && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                + แจ้งซ่อมครั้งแรก
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => <RepairCard key={r.id} request={r} onConfirm={handleConfirmRepair} />)}
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <NewRepairModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreateRepair}
        />
      )}
    </div>
  );
}
