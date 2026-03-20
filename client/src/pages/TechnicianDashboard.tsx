import { useEffect, useState, useMemo, useCallback } from "react";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import ProgressStepper from "../components/ProgressStepper";
import { fetchAssignedJobs, updateRepairStatus } from "../lib/api";
import type { RepairRequest, RequestStatus } from "../types/repair";

const PRIORITY_LABEL: Record<string, string> = { LOW: "ต่ำ", MEDIUM: "ปานกลาง", HIGH: "สูง" };
/* หมายเหตุ: PRIORITY_LABEL / PRIORITY_COLOR สอดคล้องกับ Dashboard.tsx — เพราะไม่มี shared constants file จึงเก็บไว้แยกกัน */
const PRIORITY_COLOR: Record<string, string> = {
  LOW:    "text-green-600 bg-green-50",
  MEDIUM: "text-amber-600 bg-amber-50",
  HIGH:   "text-red-600 bg-red-50",
};

const STATUS_FILTER_OPTIONS = [
  { value: "",             label: "ทั้งหมด" },
  { value: "PENDING",      label: "รอดำเนินการ" },
  { value: "IN_PROGRESS",  label: "กำลังซ่อม" },
  { value: "WAITING_REVIEW", label: "รอตรวจรับ" },
  { value: "COMPLETED",    label: "เสร็จสิ้น" },
];

const NEXT_STATUSES: Partial<Record<RequestStatus, { value: RequestStatus; label: string; color: string }[]>> = {
  PENDING:        [{ value: "IN_PROGRESS",    label: "เริ่มซ่อม",  color: "bg-blue-600 text-white" }],
  IN_PROGRESS:    [{ value: "WAITING_REVIEW", label: "รอตรวจรับ", color: "bg-amber-500 text-white" }],
  WAITING_REVIEW: [{ value: "COMPLETED",      label: "ปิดงาน",    color: "bg-green-600 text-white" }],
};

// ── Update Status Modal ───────────────────────────────────────────────────────
function UpdateModal({
  request,
  onClose,
  onUpdated,
}: {
  request: RepairRequest;
  onClose: () => void;
  onUpdated: (r: RepairRequest) => void;
}) {
  const options = NEXT_STATUSES[request.status] ?? [];
  const [status,     setNewStatus]  = useState<RequestStatus>(options[0]?.value ?? request.status);
  const [repairNote, setRepairNote] = useState(request.repairNote ?? "");
  const [remark,     setRemark]     = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const updated = await updateRepairStatus(request.id, { status, repairNote, remark });
      onUpdated(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 space-y-4 animate-scale-in">
        <h2 className="font-bold text-gray-900 text-lg">อัปเดตสถานะ</h2>
        <p className="text-sm text-gray-500 -mt-2 truncate">{request.deviceName} ({request.id})</p>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

        {/* Status select */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">สถานะใหม่</label>
          <div className="grid grid-cols-1 gap-2">
            {options.map((opt) => (
              <label key={opt.value} className={`flex items-center gap-2 rounded-xl border-2 p-3 cursor-pointer transition-all duration-200
                ${status === opt.value ? "border-blue-500 bg-blue-50 shadow-sm" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"}`}>
                <input type="radio" name="newStatus" value={opt.value}
                  checked={status === opt.value} onChange={() => setNewStatus(opt.value)} className="sr-only" />
                <StatusBadge status={opt.value} size="sm" />
                <span className="text-sm font-medium text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Repair note */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">บันทึกวิธีซ่อม</label>
          <textarea value={repairNote} onChange={(e) => setRepairNote(e.target.value)} rows={3}
            placeholder="อธิบายวิธีการซ่อม หรือปัญหาที่พบ..."
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-gray-50 outline-none
              focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition resize-none" />
        </div>

        {/* Remark */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">หมายเหตุ (ไม่บังคับ)</label>
          <input type="text" value={remark} onChange={(e) => setRemark(e.target.value)}
            placeholder="หมายเหตุเพิ่มเติม..."
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-gray-50 outline-none
              focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition" />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} disabled={loading}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            ยกเลิก
          </button>
          <button onClick={handleSubmit} disabled={loading || options.length === 0}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white
              hover:bg-blue-700 transition-colors disabled:opacity-60">
            {loading ? (
              /* CSS spinner — สม่ำเสมอกับทุกหน้า */
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                กำลังบันทึก…
              </span>
            ) : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({ job, onUpdate }: { job: RepairRequest; onUpdate: (j: RepairRequest) => void }) {
  const [expanded, setExpanded] = useState(false);
  const canUpdate = Object.keys(NEXT_STATUSES).includes(job.status);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-gray-200">
      <button className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}>
        <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
          {job.imageUrl
            ? <img src={job.imageUrl} alt="" className="w-full h-full object-cover" />
            : <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 truncate">{job.deviceName}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[job.priority]}`}>
              {PRIORITY_LABEL[job.priority]}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{job.id}</p>
          <p className="text-sm text-gray-500 mt-0.5">ผู้แจ้ง: {job.user.name}</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <StatusBadge status={job.status} size="sm" />
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 space-y-4 pt-4">
          <p className="text-sm text-gray-600">{job.description}</p>
          <ProgressStepper status={job.status} />
          {job.repairNote && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">บันทึกการซ่อม</p>
              <p className="text-sm text-amber-800">{job.repairNote}</p>
            </div>
          )}
          {canUpdate && (
            <button onClick={() => onUpdate(job)}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
              อัปเดตสถานะ
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Technician Dashboard Page ─────────────────────────────────────────────────
export default function TechnicianDashboard() {
  const [jobs,        setJobs]        = useState<RepairRequest[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [updating,    setUpdating]    = useState<RepairRequest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAssignedJobs(statusFilter || undefined);
      setJobs(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const handleUpdated = useCallback((updated: RepairRequest) => {
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? { ...j, ...updated } : j)));
    setUpdating(null);
  }, []);

  // Stats — คำนวณใหม่เฉพาะเมื่อ jobs เปลี่ยน
  const stats = useMemo(() => ({
    total:    jobs.length,
    active:   jobs.filter((j) => j.status === "IN_PROGRESS").length,
    review:   jobs.filter((j) => j.status === "WAITING_REVIEW").length,
    done:     jobs.filter((j) => j.status === "COMPLETED").length,
  }), [jobs]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">งานที่ได้รับมอบหมาย</h1>
          <p className="text-sm text-gray-500 mt-0.5">รายการคำร้องที่ได้รับมอบหมายให้คุณดูแล</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 animate-slide-up delay-75">
          {[
            { label: "งานทั้งหมด",  count: stats.total,  color: "bg-white border border-gray-100 shadow-sm text-gray-800" },
            { label: "กำลังซ่อม",     count: stats.active,  color: "bg-blue-50 text-blue-800" },
            { label: "รอตรวจรับ",     count: stats.review,  color: "bg-amber-50 text-amber-800" },
            { label: "เสร็จสิ้น",     count: stats.done,    color: "bg-green-50 text-green-800" },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl p-4 sm:p-5 ${s.color} flex items-center gap-3 sm:gap-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}>
              {/* tabular-nums — ป้องกันตัวเลขกระตุกเมื่อค่าเปลี่ยน */}
              <p className="text-2xl sm:text-3xl font-bold tabular-nums">{s.count}</p>
              <p className="text-xs font-medium leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 animate-slide-up delay-100">
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200
                ${statusFilter === opt.value
                  ? "bg-linear-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-200/50"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-sm"
                }`}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Job list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => <div key={i} className="h-24 rounded-2xl bg-white border border-gray-100 skeleton-shimmer" />)}
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-6 py-8 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <button onClick={load} className="mt-3 text-sm text-red-500 underline">ลองใหม่</button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-100 px-6 py-16 text-center">
            <svg className="mx-auto w-12 h-12 text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-500">ไม่มีงานที่รอดำเนินการ</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((j) => <JobCard key={j.id} job={j} onUpdate={setUpdating} />)}
          </div>
        )}
      </main>

      {/* Update modal */}
      {updating && (
        <UpdateModal request={updating} onClose={() => setUpdating(null)} onUpdated={handleUpdated} />
      )}
    </div>
  );
}
