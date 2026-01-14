import React, { useEffect, useMemo, useState } from "react";
import Modal from "./ui/Modal";
import { Customer, Gender } from "../types";
import { API_ORIGIN } from "../services/core/endpoints";

interface UniqueCustomer {
  latestCustomerRecord: Customer;
}

type ModalMode = "view" | "edit";

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerProfile: UniqueCustomer | null;

  // ✅ view / edit
  mode: ModalMode;

  // ✅ ตอนกด Save จะยิงขึ้น parent ทีเดียว
  onUpdateCustomer: (updatedRecord: Customer) => Promise<void> | void;

  allCustomers: Customer[];
}

/* ---------------- Config constants ---------------- */
const NATIONALITIES = [
  "American",
  "British",
  "Canadian",
  "Australian",
  "German",
  "French",
  "Japanese",
  "Chinese",
  "Thai",
];

const GENDERS: Gender[] = ["Male", "Female", "Other"];
const ID_TYPES = ["ID_CARD", "PASSPORT", "DRIVING_LICENSE"] as const;

/* ---------------- Helpers ---------------- */
const getInitials = (name: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const generateAvatarColors = (name: string) => {
  if (!name) return { backgroundColor: "#e5e7eb", textColor: "#4b5563" };

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const palette = [
    { bg: "#fecaca", text: "#991b1b" },
    { bg: "#fed7aa", text: "#9a3412" },
    { bg: "#fde68a", text: "#92400e" },
    { bg: "#d9f99d", text: "#3f6212" },
    { bg: "#bfdbfe", text: "#1e40af" },
    { bg: "#e9d5ff", text: "#5b21b6" },
    { bg: "#fbcfe8", text: "#9d174d" },
  ];

  const index = Math.abs(hash % palette.length);
  return { backgroundColor: palette[index].bg, textColor: palette[index].text };
};

const buildFaceImageUrl = (customer: Customer): string | null => {
  const raw =
    (customer as any).faceImagePath ??
    (customer as any).face_image_path ??
    (customer as any).faceImage ??
    (customer as any).face_image ??
    (customer as any).photoUrl ??
    (customer as any).photo_url ??
    (customer as any).imageUrl ??
    (customer as any).image_url ??
    "";

  const path = String(raw || "").trim();
  if (!path) return null;

  if (path.startsWith("data:image/")) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  if (path.startsWith("/uploads/")) return `${API_ORIGIN}${path}`;

  const cleaned = path.replace(/^\/+/, "");
  if (cleaned.startsWith("uploads/")) return `${API_ORIGIN}/${cleaned}`;
  if (cleaned.startsWith("faces/") || cleaned.startsWith("documents/")) {
    return `${API_ORIGIN}/uploads/${cleaned}`;
  }

  return `${API_ORIGIN}/${cleaned}`;
};

/* ---------------- UI helpers ---------------- */
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">{title}</h3>
    {children}
  </div>
);

const FieldRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
    <dt className="text-sm font-medium text-gray-700">{label}</dt>
    <dd className="mt-1 text-sm text-gray-800 sm:col-span-2 sm:mt-0">{children}</dd>
  </div>
);

const ReadOnly: React.FC<{ value?: any; fallback?: string }> = ({ value, fallback = "—" }) => {
  const text = (value ?? "").toString().trim();
  return <span className="text-gray-900">{text || fallback}</span>;
};

/* ---------------- Main ---------------- */
const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  isOpen,
  onClose,
  customerProfile,
  mode,
  onUpdateCustomer,
}) => {
  const isEdit = mode === "edit";

  // ✅ original = ข้อมูลจาก backend (เอาไว้เช็ค dirty)
  const original = useMemo(() => customerProfile?.latestCustomerRecord ?? null, [customerProfile]);

  // ✅ draft = ข้อมูลที่กำลังแก้ไขในฟอร์ม
  const [draft, setDraft] = useState<Customer | null>(original);
  const [hasImageError, setHasImageError] = useState(false);

  // ✅ ปุ่ม Save
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // รีเซ็ต draft เมื่อเปลี่ยนคน
  useEffect(() => {
    setDraft(original);
    setHasImageError(false);
    setSaveError(null);
    setSaving(false);
  }, [original]);

  // ✅ FIX: Hook ต้องอยู่ก่อน return เสมอ (กัน hook order เปลี่ยน)
  const isDirty = useMemo(() => {
    if (!original || !draft) return false;

    const pick = (c: Customer) => ({
      fullName: c.fullName ?? "",
      nationality: c.nationality ?? "",
      gender: c.gender ?? "",
      idType: (c as any).idType ?? (c as any).id_type ?? "",
      idNumber: (c as any).idNumber ?? (c as any).id_number ?? "",
    });

    return JSON.stringify(pick(original)) !== JSON.stringify(pick(draft));
  }, [original, draft]);

  // ✅ return หลัง hook เท่านั้น
  if (!draft) return null;

  const faceUrl = buildFaceImageUrl(draft);
  const avatarColors = generateAvatarColors(draft.fullName);

  const updateDraft = (patch: Partial<Customer>) => {
    setDraft((prev) => (prev ? ({ ...prev, ...patch } as Customer) : prev));
  };

  const handleSave = async () => {
    if (!draft) return;

    setSaving(true);
    setSaveError(null);

    try {
      await onUpdateCustomer(draft);
      onClose();
    } catch (e: any) {
      const msg =
        e?.body?.message ||
        e?.body?.error ||
        (typeof e?.body === "string" ? e.body : null) ||
        e?.message ||
        "Save failed";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between gap-3">
          <div className="font-semibold text-gray-900">Customer Profile: {draft.fullName}</div>

          <span
            className={`text-xs font-bold px-2 py-1 rounded-full ${
              isEdit ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
            }`}
          >
            {isEdit ? "EDIT MODE" : "VIEW MODE"}
          </span>
        </div>
      }
    >
      <div className="space-y-6">
        <Section title="Guest Profile">
          <div className="flex justify-center mb-6">
            {faceUrl && !hasImageError ? (
              <img
                src={faceUrl}
                alt={`${draft.fullName}'s face`}
                className="w-32 h-32 rounded-full object-cover border"
                onError={() => setHasImageError(true)}
              />
            ) : (
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center text-5xl font-bold"
                style={avatarColors}
              >
                {getInitials(draft.fullName)}
              </div>
            )}
          </div>

          <dl className="divide-y">
            <FieldRow label="Name">
              {isEdit ? (
                <input
                  value={draft.fullName ?? ""}
                  onChange={(e) => updateDraft({ fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Full name"
                />
              ) : (
                <ReadOnly value={draft.fullName} />
              )}
            </FieldRow>

            <FieldRow label="Nationality">
              {isEdit ? (
                <select
                  value={draft.nationality ?? ""}
                  onChange={(e) => updateDraft({ nationality: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="" disabled>
                    Select nationality
                  </option>
                  {NATIONALITIES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              ) : (
                <ReadOnly value={draft.nationality} />
              )}
            </FieldRow>

            <FieldRow label="Gender">
              {isEdit ? (
                <select
                  value={(draft.gender as any) ?? ""}
                  onChange={(e) => updateDraft({ gender: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="" disabled>
                    Select gender
                  </option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              ) : (
                <ReadOnly value={draft.gender} />
              )}
            </FieldRow>
          </dl>
        </Section>

        <Section title="Identification Document">
          <dl className="divide-y">
            <FieldRow label="ID Type">
              {isEdit ? (
                <select
                  value={((draft as any).idType ?? (draft as any).id_type ?? "") as string}
                  onChange={(e) => updateDraft({ idType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="" disabled>
                    Select ID type
                  </option>
                  {ID_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              ) : (
                <ReadOnly value={(draft as any).idType ?? (draft as any).id_type} />
              )}
            </FieldRow>

            <FieldRow label="ID Number">
              {isEdit ? (
                <input
                  value={((draft as any).idNumber ?? (draft as any).id_number ?? "") as string}
                  onChange={(e) => updateDraft({ idNumber: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="ID number"
                />
              ) : (
                <ReadOnly value={(draft as any).idNumber ?? (draft as any).id_number} />
              )}
            </FieldRow>
          </dl>
        </Section>

        {isEdit && (
          <div className="pt-4 border-t border-gray-200 flex items-center justify-between gap-3">
            <div className="text-sm">
              {saveError ? (
                <span className="text-red-600 font-medium">{saveError}</span>
              ) : isDirty ? (
                <span className="text-amber-700 font-medium">มีการแก้ไขที่ยังไม่บันทึก</span>
              ) : (
                <span className="text-gray-500">ยังไม่มีการเปลี่ยนแปลง</span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Confirm / Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CustomerDetailsModal;
