export type PilgrimStatus = "DRAFT"|"REGISTERED"|"DOCUMENTS_UPLOADED"|"READY_FOR_BOOKING"|"BOOKED"|"PERMIT_ISSUED"|"COMPLETED"|"CANCELLED";
export type GroupStatus = "DRAFT"|"READY"|"SUBMITTED"|"CONFIRMED"|"COMPLETED"|"CANCELLED";
export type InvoiceStatus = "DRAFT"|"ISSUED"|"PAID"|"OVERDUE"|"CANCELLED";

export interface Pilgrim {
  id: string; fullNameAr: string; fullNameEn: string; passportNumber: string; nationality: string;
  status: PilgrimStatus; phone?: string; groupName?: string; createdAt: string;
}
export interface Group {
  id: string; name: string; description?: string; maxSize: number; status: GroupStatus;
  memberCount: number; scheduledDate?: string;
}
export interface Invoice {
  id: string; invoiceNumber: string; amount: number; currency: string; status: InvoiceStatus; dueDate?: string;
}

export const pilgrims: Pilgrim[] = [
  { id: "1", fullNameAr: "عبد الله محمد أحمد", fullNameEn: "Abdullah Mohamed Ahmed", passportNumber: "A12345678", nationality: "DZ", status: "READY_FOR_BOOKING", phone: "+213 555 123 456", groupName: "فوج مكة 01", createdAt: "2026-03-10" },
  { id: "2", fullNameAr: "فاطمة الزهراء بن علي", fullNameEn: "Fatima Zahra Ben Ali", passportNumber: "B87654321", nationality: "DZ", status: "DOCUMENTS_UPLOADED", phone: "+213 555 987 654", groupName: "فوج المدينة 03", createdAt: "2026-03-12" },
  { id: "3", fullNameAr: "أحمد حسين القاضي", fullNameEn: "Ahmed Hussein Al-Qadi", passportNumber: "C11223344", nationality: "SA", status: "BOOKED", phone: "+966 50 123 4567", groupName: "فوج مكة 01", createdAt: "2026-03-08" },
  { id: "4", fullNameAr: "مريم صالح التميمي", fullNameEn: "Mariam Saleh Al-Tamimi", passportNumber: "D55667788", nationality: "DZ", status: "REGISTERED", groupName: "فوج جدة 02", createdAt: "2026-03-14" },
  { id: "5", fullNameAr: "يوسف إبراهيم", fullNameEn: "Youssef Ibrahim", passportNumber: "E99887766", nationality: "MA", status: "COMPLETED", groupName: "فوج مكة 01", createdAt: "2026-02-28" },
  { id: "6", fullNameAr: "خديجة عبد الرحمن", fullNameEn: "Khadija Abderrahmane", passportNumber: "F44332211", nationality: "DZ", status: "DRAFT", createdAt: "2026-03-15" },
];

export const groups: Group[] = [
  { id: "g1", name: "فوج مكة 01", description: "رمضان 1447 - فندق الصفوة", maxSize: 45, status: "CONFIRMED", memberCount: 38, scheduledDate: "2026-03-20" },
  { id: "g2", name: "فوج المدينة 03", description: "شوال 1447 - فندق دار الإيمان", maxSize: 30, status: "READY", memberCount: 22, scheduledDate: "2026-04-05" },
  { id: "g3", name: "فوج جدة 02", description: "عمرة رجب - اقتصادي", maxSize: 50, status: "DRAFT", memberCount: 8, scheduledDate: "2026-04-12" },
];

export const invoices: Invoice[] = [
  { id: "inv1", invoiceNumber: "INV-2026-001", amount: 245000, currency: "DZD", status: "PAID", dueDate: "2026-03-15" },
  { id: "inv2", invoiceNumber: "INV-2026-002", amount: 189000, currency: "DZD", status: "ISSUED", dueDate: "2026-03-20" },
  { id: "inv3", invoiceNumber: "INV-2026-003", amount: 320000, currency: "DZD", status: "OVERDUE", dueDate: "2026-03-10" },
];

export const statusLabels: Record<string, string> = {
  DRAFT: "مسودة", REGISTERED: "مسجل", DOCUMENTS_UPLOADED: "وثائق مرفوعة",
  READY_FOR_BOOKING: "جاهز للحجز", BOOKED: "محجوز", PERMIT_ISSUED: "تصريح صادر",
  COMPLETED: "مكتمل", CANCELLED: "ملغى",
  READY: "جاهز", SUBMITTED: "مرسل", CONFIRMED: "مؤكد",
  ISSUED: "صادر", PAID: "مدفوع", OVERDUE: "متأخر",
};

export const statusColors: Record<string, string> = {
  DRAFT: "#94a3b8", REGISTERED: "#0ea5e9", DOCUMENTS_UPLOADED: "#8b5cf6",
  READY_FOR_BOOKING: "#f59e0b", BOOKED: "#06b6d4", PERMIT_ISSUED: "#10b981",
  COMPLETED: "#22c55e", CANCELLED: "#ef4444",
  READY: "#f59e0b", SUBMITTED: "#6366f1", CONFIRMED: "#10b981",
  ISSUED: "#0ea5e9", PAID: "#22c55e", OVERDUE: "#ef4444",
};
