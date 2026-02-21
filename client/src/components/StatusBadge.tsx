import type { RequestStatus } from "../types/repair";

interface Props {
  status: RequestStatus;
  size?: "sm" | "md";
}

const CONFIG: Record<RequestStatus, { label: string; className: string }> = {
  PENDING:        { label: "รอดำเนินการ", className: "bg-amber-100 text-amber-700 ring-amber-300" },
  IN_PROGRESS:    { label: "กำลังซ่อม",  className: "bg-blue-100 text-blue-700 ring-blue-300" },
  WAITING_REVIEW: { label: "รอตรวจรับ",  className: "bg-purple-100 text-purple-700 ring-purple-300" },
  COMPLETED:      { label: "เสร็จสิ้น",  className: "bg-green-100 text-green-700 ring-green-300" },
};

export default function StatusBadge({ status, size = "md" }: Props) {
  const { label, className } = CONFIG[status];
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset ${sizeClass} ${className}`}>
      {label}
    </span>
  );
}
