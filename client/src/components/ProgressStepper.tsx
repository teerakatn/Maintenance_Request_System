import type { RequestStatus } from "../types/repair";

/* ── ข้อมูลแต่ละขั้นตอน ─────────────────────────────────────────────────────── */
interface Step {
  key: RequestStatus;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { key: "PENDING",        label: "รอดำเนินการ", description: "คำร้องถูกส่งเข้าระบบแล้ว"     },
  { key: "IN_PROGRESS",    label: "กำลังซ่อม",  description: "ช่างรับงานและเริ่มดำเนินการ"   },
  { key: "WAITING_REVIEW", label: "รอตรวจรับ",  description: "ช่างซ่อมเสร็จ รอผู้แจ้งยืนยัน" },
  { key: "COMPLETED",      label: "เสร็จสิ้น",  description: "ยืนยันรับงานเรียบร้อย"         },
];

/* Map status → ตำแหน่ง index เพื่อเปรียบเทียบแบบตัวเลข */
const STATUS_INDEX: Record<RequestStatus, number> = {
  PENDING:        0,
  IN_PROGRESS:    1,
  WAITING_REVIEW: 2,
  COMPLETED:      3,
};

interface Props {
  status: RequestStatus;
}

export default function ProgressStepper({ status }: Props) {
  const currentIndex = STATUS_INDEX[status];

  return (
    /* role="list" เพิ่ม semantic ที่ถูกต้อง — ol แสดงลำดับขั้นตอน */
    <ol className="flex items-start w-full" role="list">
      {STEPS.map((step, idx) => {
        /* isDone: ขั้นตอนนี้ผ่านแล้ว (รวมขั้นสุดท้ายเมื่อ COMPLETED) */
        const isDone    = idx < currentIndex || (status === "COMPLETED" && idx === currentIndex);
        /* isCurrent: ขั้นตอนที่กำลังดำเนินการอยู่ */
        const isCurrent = idx === currentIndex && status !== "COMPLETED";

        return (
          <li
            key={step.key}
            /* aria-current="step" บอก screen reader ว่านี่คือขั้นตอนปัจจุบัน */
            aria-current={isCurrent ? "step" : undefined}
            className={`flex flex-col items-center flex-1 ${idx < STEPS.length - 1 ? "relative" : ""}`}
          >
            {/* เส้น connector ระหว่าง step — วางไว้ใต้วงกลม (-z-10) */}
            {idx < STEPS.length - 1 && (
              <div className="absolute top-4 left-1/2 w-full h-0.5 -z-10">
                <div
                  className={`h-full transition-all duration-700 ease-out ${isDone ? "bg-linear-to-r from-blue-500 to-blue-400" : "bg-gray-200"}`}
                />
              </div>
            )}

            {/* วงกลมแสดงสถานะ: สีน้ำเงินเมื่อ done, ขอบน้ำเงิน+ring เมื่อ current */}
            <div
              className={`
                flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-semibold
                transition-all duration-500 shrink-0
                ${isDone
                  ? "bg-linear-to-br from-blue-500 to-blue-600 border-blue-500 text-white shadow-md shadow-blue-200/50"
                  : isCurrent
                    ? "bg-white border-blue-500 text-blue-600 ring-4 ring-blue-100 shadow-sm scale-110"
                    : "bg-white border-gray-200 text-gray-400"
                }
              `}
            >
              {isDone ? (
                /* แสดง checkmark เมื่อขั้นตอนเสร็จแล้ว */
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                /* แสดงตัวเลขลำดับเมื่อยังไม่ถึง */
                idx + 1
              )}
            </div>

            {/* ป้ายกำกับและคำอธิบายใต้วงกลม */}
            <div className="mt-2 text-center px-1">
              <p
                className={`text-xs font-semibold leading-tight ${
                  isCurrent ? "text-blue-600" : isDone ? "text-gray-700" : "text-gray-400"
                }`}
              >
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
