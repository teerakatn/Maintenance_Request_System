import nodemailer from "nodemailer";

// ---------------------------------------------------------------------------
// HTML Escape — ป้องกัน HTML Injection ในเนื้อ Email
// ---------------------------------------------------------------------------
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------------------------
// Transporter — ใช้ Gmail SMTP หรือ Ethereal (test) ตาม .env
// ---------------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST  ?? "smtp.ethereal.email",
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
  },
});

const FROM = process.env.SMTP_FROM ?? '"ระบบแจ้งซ่อม" <no-reply@repair.local>';

// ---------------------------------------------------------------------------
// แจ้งผู้แจ้งซ่อม: สถานะเปลี่ยน
// ---------------------------------------------------------------------------
const STATUS_LABEL: Record<string, string> = {
  PENDING:        "รอดำเนินการ",
  IN_PROGRESS:    "กำลังซ่อม",
  WAITING_REVIEW: "รอตรวจรับ",
  COMPLETED:      "เสร็จสิ้น",
};

export async function sendStatusChangedEmail(opts: {
  toEmail:   string;
  toName:    string;
  requestId: string;
  deviceName: string;
  newStatus: string;
}) {
  const label = STATUS_LABEL[opts.newStatus] ?? opts.newStatus;
  const safeName   = escapeHtml(opts.toName);
  const safeId     = escapeHtml(opts.requestId);
  const safeDevice = escapeHtml(opts.deviceName);
  const safeLabel  = escapeHtml(label);

  await transporter.sendMail({
    from:    FROM,
    to:      opts.toEmail,
    subject: `[แจ้งซ่อม] คำร้อง ${safeId} — สถานะอัปเดต: ${safeLabel}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#2563eb">อัปเดตสถานะคำร้องแจ้งซ่อม</h2>
        <p>เรียน คุณ${safeName}</p>
        <p>คำร้องของคุณมีการเปลี่ยนแปลงสถานะ:</p>
        <table style="border-collapse:collapse;width:100%">
          <tr>
            <td style="padding:8px;background:#f1f5f9;font-weight:600">เลขที่คำร้อง</td>
            <td style="padding:8px">${safeId}</td>
          </tr>
          <tr>
            <td style="padding:8px;background:#f1f5f9;font-weight:600">อุปกรณ์</td>
            <td style="padding:8px">${safeDevice}</td>
          </tr>
          <tr>
            <td style="padding:8px;background:#f1f5f9;font-weight:600">สถานะปัจจุบัน</td>
            <td style="padding:8px">
              <span style="background:#dbeafe;color:#1d4ed8;padding:2px 10px;border-radius:99px;font-weight:600">
                ${safeLabel}
              </span>
            </td>
          </tr>
        </table>
        <p style="color:#64748b;font-size:13px;margin-top:24px">
          กรุณาเข้าสู่ระบบเพื่อตรวจสอบรายละเอียดเพิ่มเติม
        </p>
      </div>
    `,
  });
}

// ---------------------------------------------------------------------------
// แจ้งช่าง: ได้รับมอบหมายงานใหม่
// ---------------------------------------------------------------------------
export async function sendAssignedEmail(opts: {
  toEmail:    string;
  toName:     string;
  requestId:  string;
  deviceName: string;
  priority:   string;
}) {
  const priorityLabel: Record<string, string> = {
    LOW: "ต่ำ", MEDIUM: "ปานกลาง", HIGH: "สูง",
  };

  const safeName     = escapeHtml(opts.toName);
  const safeId       = escapeHtml(opts.requestId);
  const safeDevice   = escapeHtml(opts.deviceName);
  const safePriority = escapeHtml(priorityLabel[opts.priority] ?? opts.priority);

  await transporter.sendMail({
    from:    FROM,
    to:      opts.toEmail,
    subject: `[แจ้งซ่อม] คุณได้รับมอบหมายงานใหม่: ${safeId}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#2563eb">ได้รับมอบหมายงานซ่อมใหม่</h2>
        <p>เรียน ช่าง${safeName}</p>
        <p>คุณได้รับมอบหมายงานซ่อมใหม่ดังนี้:</p>
        <table style="border-collapse:collapse;width:100%">
          <tr>
            <td style="padding:8px;background:#f1f5f9;font-weight:600">เลขที่คำร้อง</td>
            <td style="padding:8px">${safeId}</td>
          </tr>
          <tr>
            <td style="padding:8px;background:#f1f5f9;font-weight:600">อุปกรณ์</td>
            <td style="padding:8px">${safeDevice}</td>
          </tr>
          <tr>
            <td style="padding:8px;background:#f1f5f9;font-weight:600">ระดับความเร่งด่วน</td>
            <td style="padding:8px">${safePriority}</td>
          </tr>
        </table>
        <p style="color:#64748b;font-size:13px;margin-top:24px">
          กรุณาเข้าสู่ระบบเพื่อรับงานและดำเนินการซ่อม
        </p>
      </div>
    `,
  });
}
