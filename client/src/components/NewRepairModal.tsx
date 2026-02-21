import { useRef, useState } from "react";
import type { CreateRepairPayload, Priority } from "../types/repair";

interface Props {
  onClose: () => void;
  onSubmit: (payload: CreateRepairPayload) => Promise<void>;
}

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: "LOW",    label: "ต่ำ",       color: "bg-green-100 text-green-700 ring-green-300" },
  { value: "MEDIUM", label: "ปานกลาง",  color: "bg-amber-100 text-amber-700 ring-amber-300" },
  { value: "HIGH",   label: "สูง",       color: "bg-red-100 text-red-700 ring-red-300" },
];

export default function NewRepairModal({ onClose, onSubmit }: Props) {
  const [deviceName, setDeviceName]   = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority]       = useState<Priority>("MEDIUM");
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!deviceName.trim())          errs.deviceName = "กรุณาระบุชื่ออุปกรณ์";
    if (description.trim().length < 10) errs.description = "อาการเสียต้องมีความยาวอย่างน้อย 10 ตัวอักษร";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit({
        deviceName: deviceName.trim(),
        description: description.trim(),
        priority,
        image: imageFile ?? undefined,
      });
      onClose();
    } catch (err: unknown) {
      setErrors({ general: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" });
    } finally {
      setLoading(false);
    }
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">แจ้งซ่อมใหม่</h2>
            <p className="text-sm text-gray-500 mt-0.5">กรอกข้อมูลอุปกรณ์ที่ต้องการซ่อม</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {errors.general && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {errors.general}
            </div>
          )}

          {/* ชื่ออุปกรณ์ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              ชื่ออุปกรณ์ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="เช่น คอมพิวเตอร์, เครื่องปรับอากาศ"
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${errors.deviceName ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"}`}
            />
            {errors.deviceName && <p className="mt-1 text-xs text-red-500">{errors.deviceName}</p>}
          </div>

          {/* อาการเสีย */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              อาการเสีย / รายละเอียด <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="อธิบายอาการเสียหรือปัญหาที่พบ..."
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none resize-none transition-all
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${errors.description ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"}`}
            />
            <div className="flex justify-between mt-1">
              {errors.description
                ? <p className="text-xs text-red-500">{errors.description}</p>
                : <span />}
              <span className="text-xs text-gray-400">{description.length} ตัวอักษร</span>
            </div>
          </div>

          {/* ระดับความเร่งด่วน */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ระดับความเร่งด่วน
            </label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-all ring-1 ring-inset
                    ${priority === p.value
                      ? p.color + " border-transparent scale-105 shadow-sm"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* รูปภาพ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              แนบรูปภาพ <span className="text-gray-400">(ไม่บังคับ)</span>
            </label>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="preview"
                  className="w-full h-40 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-lg border-2 border-dashed border-gray-300 py-8 text-center
                  hover:border-blue-400 hover:bg-blue-50 transition-colors group"
              >
                <svg className="mx-auto w-8 h-8 text-gray-400 group-hover:text-blue-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm text-gray-500 group-hover:text-blue-500">คลิกเพื่อเลือกรูปภาพ</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP — ขนาดไม่เกิน 5MB</p>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  กำลังส่ง...
                </span>
              ) : "ส่งคำร้อง"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
