import type { RequestStatus } from "../types/repair";

interface Props {
  status: RequestStatus;
  size?: "sm" | "md";
}

/* แต่ละ status มี label, สี badge, สี dot และ animation */
const CONFIG: Record<
  RequestStatus,
  { label: string; badgeClass: string; dotClass: string; dotAnimate?: string }
> = {
  PENDING: {
    label:      "รอดำเนินการ",
    badgeClass: "bg-amber-100 text-amber-700 ring-amber-300",
    dotClass:   "bg-amber-400",
    dotAnimate: "animate-pulse", /* กระพริบเพื่อบ่งบอกว่ายังรอ */
  },
  IN_PROGRESS: {
    label:      "กำลังซ่อม",
    badgeClass: "bg-blue-100 text-blue-700 ring-blue-300",
    dotClass:   "bg-blue-500",
    dotAnimate: "animate-pulse",
  },
  WAITING_REVIEW: {
    label:      "รอตรวจรับ",
    badgeClass: "bg-purple-100 text-purple-700 ring-purple-300",
    dotClass:   "bg-purple-500",
  },
  COMPLETED: {
    label:      "เสร็จสิ้น",
    badgeClass: "bg-green-100 text-green-700 ring-green-300",
    dotClass:   "bg-green-500",
  },
};

export default function StatusBadge({ status, size = "md" }: Props) {
  const { label, badgeClass, dotClass, dotAnimate = "" } = CONFIG[status];

  /* ขนาดของ badge และ dot ปรับตาม prop size */
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs gap-1"   : "px-3 py-1 text-sm gap-1.5";
  const dotSize   = size === "sm" ? "w-1.5 h-1.5"                  : "w-2 h-2";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset ${sizeClass} ${badgeClass}`}
    >
      {/* จุดสีแสดงสถานะ — ทำให้แยกแยะได้เร็วแม้ไม่ได้อ่านข้อความ */}
      <span className={`${dotSize} rounded-full shrink-0 ${dotClass} ${dotAnimate}`} />
      {label}
    </span>
  );
}
