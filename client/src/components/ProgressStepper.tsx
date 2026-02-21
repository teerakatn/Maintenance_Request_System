import type { RequestStatus } from "../types/repair";

interface Step {
  key: RequestStatus;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { key: "PENDING",        label: "รอดำเนินการ", description: "คำร้องถูกส่งเข้าระบบแล้ว" },
  { key: "IN_PROGRESS",    label: "กำลังซ่อม",  description: "ช่างรับงานและเริ่มดำเนินการ" },
  { key: "WAITING_REVIEW", label: "รอตรวจรับ",  description: "ช่างซ่อมเสร็จ รอผู้แจ้งยืนยัน" },
  { key: "COMPLETED",      label: "เสร็จสิ้น",  description: "ยืนยันรับงานเรียบร้อย" },
];

const STATUS_INDEX: Record<RequestStatus, number> = {
  PENDING: 0,
  IN_PROGRESS: 1,
  WAITING_REVIEW: 2,
  COMPLETED: 3,
};

interface Props {
  status: RequestStatus;
}

export default function ProgressStepper({ status }: Props) {
  const currentIndex = STATUS_INDEX[status];

  return (
    <ol className="flex items-start w-full">
      {STEPS.map((step, idx) => {
        const isDone    = idx < currentIndex;
        const isCurrent = idx === currentIndex;

        return (
          <li key={step.key} className={`flex flex-col items-center flex-1 ${idx < STEPS.length - 1 ? "relative" : ""}`}>
            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div className="absolute top-4 left-1/2 w-full h-0.5 -z-10">
                <div className={`h-full transition-all duration-500 ${isDone ? "bg-blue-500" : "bg-gray-200"}`} />
              </div>
            )}

            {/* Circle icon */}
            <div
              className={`
                flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-semibold
                transition-all duration-300 shrink-0
                ${isDone    ? "bg-blue-500 border-blue-500 text-white"
                : isCurrent ? "bg-white border-blue-500 text-blue-600 ring-4 ring-blue-100"
                :              "bg-white border-gray-200 text-gray-400"}
              `}
            >
              {isDone ? (
                // Checkmark
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                idx + 1
              )}
            </div>

            {/* Label */}
            <div className="mt-2 text-center px-1">
              <p className={`text-xs font-semibold leading-tight ${isCurrent ? "text-blue-600" : isDone ? "text-gray-700" : "text-gray-400"}`}>
                {step.label}
              </p>
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5 hidden sm:block">
                {step.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
