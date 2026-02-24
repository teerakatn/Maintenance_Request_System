import { useEffect, useState, useMemo, useCallback } from "react";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import { fetchAllRepairs, fetchTechnicians, assignRepair, fetchAdminSummary } from "../lib/api";
import type { AdminSummaryData } from "../lib/api";
import type { RepairRequest } from "../types/repair";

const PRIORITY_LABEL: Record<string, string> = { LOW: "ต่ำ", MEDIUM: "ปานกลาง", HIGH: "สูง" };
const PRIORITY_COLOR: Record<string, string> = {
  LOW:    "text-green-600 bg-green-50",
  MEDIUM: "text-amber-600 bg-amber-50",
  HIGH:   "text-red-600 bg-red-50",
};

interface Technician { id: number; name: string; email: string }

// ── Assign Modal ──────────────────────────────────────────────────────────────
function AssignModal({
  repair,
  technicians,
  onClose,
  onAssigned,
}: {
  repair: RepairRequest;
  technicians: Technician[];
  onClose: () => void;
  onAssigned: (r: RepairRequest) => void;
}) {
  const [techId,  setTechId]  = useState<number | null>(repair.technician?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSubmit() {
    if (!techId) return;
    setLoading(true); setError(null);
    try {
      const updated = await assignRepair(repair.id, techId);
      onAssigned(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "มอบหมายงานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 space-y-4">
        <h2 className="font-bold text-gray-900 text-lg">มอบหมายงาน</h2>
        <p className="text-sm text-gray-500 -mt-2 truncate">{repair.deviceName} ({repair.id})</p>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">เลือกช่างซ่อม</label>
          {technicians.length === 0 ? (
            <p className="text-sm text-gray-400 italic">ไม่มีช่างในระบบ</p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {technicians.map((t) => (
                <label key={t.id} className={`flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-all
                  ${techId === t.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <input type="radio" name="tech" value={t.id}
                    checked={techId === t.id} onChange={() => setTechId(t.id)} className="sr-only" />
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.email}</p>
                  </div>
                  {techId === t.id && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} disabled={loading}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            ยกเลิก
          </button>
          <button onClick={handleSubmit} disabled={loading || !techId}
            className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 transition-colors disabled:opacity-60">
            {loading ? "กำลังมอบหมาย…" : "มอบหมาย"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [repairs,      setRepairs]      = useState<RepairRequest[]>([]);
  const [technicians,  setTechnicians]  = useState<Technician[]>([]);
  const [summary,      setSummary]      = useState<AdminSummaryData>({ counts: { total: 0, pending: 0, inProgress: 0, waitingReview: 0, completed: 0 }, byPriority: [], recentRequests: [] });
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [assigning,    setAssigning]    = useState<RepairRequest | null>(null);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [repairRes, techRes, summaryRes] = await Promise.all([
        fetchAllRepairs({ status: statusFilter || undefined, page, limit: 20 }),
        fetchTechnicians(),
        fetchAdminSummary(),
      ]);
      setRepairs(repairRes.data);
      setTotalPages(repairRes.pagination.totalPages);
      setTechnicians(techRes);
      setSummary(summaryRes);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  // เปลี่ยน filter → reset page ไปพร้อมกันใน event เดียวกัน (ป้องกัน double-load เมื่อ filter เปลี่ยน)
  const handleFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleAssigned = useCallback((updated: RepairRequest) => {
    setRepairs((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
    setAssigning(null);
  }, []);

  const STATUS_TABS = useMemo(() => [
    { value: "",              label: "ทั้งหมด",    count: summary.counts.total },
    { value: "PENDING",       label: "รอดำเนินการ", count: summary.counts.pending },
    { value: "IN_PROGRESS",   label: "กำลังซ่อม",   count: summary.counts.inProgress },
    { value: "WAITING_REVIEW",label: "รอตรวจรับ",   count: summary.counts.waitingReview },
    { value: "COMPLETED",     label: "เสร็จสิ้น",   count: summary.counts.completed },
  ], [summary]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">จัดการคำร้องซ่อม</h1>
            <p className="text-sm text-gray-500 mt-0.5">ดูและมอบหมายงานให้ช่างซ่อมทั้งหมดในระบบ</p>
          </div>
          <button onClick={load}
            className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-500 hover:border-gray-300 transition-colors"
            title="รีเฟรช">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "คำร้องทั้งหมด",  count: summary.counts.total,      color: "bg-white border border-gray-100 shadow-sm text-gray-800" },
            { label: "รอดำเนินการ",    count: summary.counts.pending,    color: "bg-amber-50 text-amber-800" },
            { label: "กำลังซ่อม",      count: summary.counts.inProgress, color: "bg-blue-50 text-blue-800" },
            { label: "เสร็จสิ้น",       count: summary.counts.completed,  color: "bg-green-50 text-green-800" },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl p-4 ${s.color} flex items-center gap-3`}>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs font-medium leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button key={tab.value} onClick={() => handleFilterChange(tab.value)}
              className={`shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors
                ${statusFilter === tab.value
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                }`}>
              {tab.label}
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold
                ${statusFilter === tab.value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Table / Cards */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map((i) => <div key={i} className="h-20 rounded-2xl bg-white border border-gray-100 animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-6 py-8 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <button onClick={load} className="mt-3 text-sm text-red-500 underline">ลองใหม่</button>
          </div>
        ) : repairs.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-100 px-6 py-16 text-center">
            <p className="text-gray-500">ไม่มีคำร้องในหมวดนี้</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Table header (hidden on mobile) */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <div className="col-span-3">อุปกรณ์</div>
              <div className="col-span-2">ผู้แจ้ง</div>
              <div className="col-span-1">ลำดับความสำคัญ</div>
              <div className="col-span-2">สถานะ</div>
              <div className="col-span-2">ช่างที่รับผิดชอบ</div>
              <div className="col-span-2 text-right">จัดการ</div>
            </div>

            <div className="divide-y divide-gray-50">
              {repairs.map((r) => (
                <div key={r.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors items-center">
                  {/* Device */}
                  <div className="sm:col-span-3">
                    <p className="font-semibold text-gray-900 text-sm truncate">{r.deviceName}</p>
                    <p className="text-[11px] text-gray-400 font-mono">{r.id}</p>
                  </div>
                  {/* Reporter */}
                  <div className="sm:col-span-2">
                    <p className="text-sm text-gray-700 truncate">{r.user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{r.user.email}</p>
                  </div>
                  {/* Priority */}
                  <div className="sm:col-span-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[r.priority]}`}>
                      {PRIORITY_LABEL[r.priority]}
                    </span>
                  </div>
                  {/* Status */}
                  <div className="sm:col-span-2">
                    <StatusBadge status={r.status} size="sm" />
                  </div>
                  {/* Technician */}
                  <div className="sm:col-span-2">
                    {r.technician ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {r.technician.name.charAt(0)}
                        </div>
                        <p className="text-sm text-gray-700 truncate">{r.technician.name}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">ยังไม่มอบหมาย</span>
                    )}
                  </div>
                  {/* Action */}
                  <div className="sm:col-span-2 sm:text-right">
                    {r.status !== "COMPLETED" && (
                      <button onClick={() => setAssigning(r)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {r.technician ? "เปลี่ยนช่าง" : "มอบหมาย"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600
                disabled:opacity-40 hover:bg-gray-50 transition-colors">
              ← ก่อนหน้า
            </button>
            <span className="text-sm text-gray-500 px-2">หน้า {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600
                disabled:opacity-40 hover:bg-gray-50 transition-colors">
              ถัดไป →
            </button>
          </div>
        )}
      </main>

      {/* Assign modal */}
      {assigning && (
        <AssignModal
          repair={assigning}
          technicians={technicians}
          onClose={() => setAssigning(null)}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  );
}
