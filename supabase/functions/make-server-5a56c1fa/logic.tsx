// Logika bisnis bersama untuk server Pinjam.in (stok, status otomatis, log aktivitas).
import * as kv from "./kv_store.tsx";

export type Status = "Menunggu" | "Disetujui" | "Ditolak" | "Dipinjam" | "Dikembalikan" | "Terlambat" | "Dibatalkan" | "Kedaluwarsa";
export const OCCUPYING: Status[] = ["Disetujui", "Dipinjam", "Terlambat"];
export const COLLECTIONS = ["users", "items", "categories", "loans", "notifs", "rules", "activity", "chats", "broadcasts"] as const;
export type Col = (typeof COLLECTIONS)[number];

export const DEFAULT_RULES = { maxDaysAheadForBooking: 7, maxLoanDurationDays: 3, pickupDeadlineDaysAfterStart: 1, maxActiveItemTypesPerUser: 3 };

const K = (c: Col) => `pinjamin:${c}`;
export const read = async <T = any>(c: Col, d: T): Promise<T> => ((await kv.get(K(c))) ?? d) as T;
export const write = (c: Col, v: unknown) => kv.set(K(c), v);

// Tanggal (zona waktu Indonesia Barat agar "hari ini" sama dengan pengguna)
export const today = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const stamp = () => new Date().toISOString();
export const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const usedOn = (loans: any[], itemId: string, date: string, now = today(), skipId?: string) =>
  loans
    .filter((l) => l.id !== skipId && OCCUPYING.includes(l.status))
    .filter((l) => date >= l.start && date <= (l.status === "Terlambat" && l.end < now ? now : l.end))
    .reduce((s, l) => s + l.items.filter((i: any) => i.itemId === itemId).reduce((a: number, i: any) => a + i.qty, 0), 0);

/** Sisa stok minimum di rentang tanggal. */
export const availableRange = (loans: any[], items: any[], itemId: string, start: string, end: string, skipId?: string) => {
  const it = items.find((x) => x.id === itemId);
  if (!it) return 0;
  let min = it.stok_total;
  for (let d = start; d <= end; d = addDays(d, 1)) min = Math.min(min, it.stok_total - usedOn(loans, itemId, d, today(), skipId));
  return Math.max(0, min);
};

export const pushNotif = (notifs: any[], n: Record<string, unknown>) =>
  notifs.unshift({ id: uid("n"), at: stamp(), read: false, readBy: [], ...n });

export const log = async (entry: { userId?: string; actor: string; action: string; detail?: string; target?: string }) => {
  const a = await read<any[]>("activity", []);
  a.unshift({ id: uid("a"), at: stamp(), ...entry });
  await write("activity", a.slice(0, 2000));
};

/** Status otomatis: Dipinjam → Terlambat, Disetujui lewat batas ambil → Kedaluwarsa, plus pengingat H-1. */
export const sweep = async () => {
  const [loans, notifs, rules] = await Promise.all([read<any[]>("loans", []), read<any[]>("notifs", []), read("rules", DEFAULT_RULES)]);
  const now = today();
  let changed = false;
  for (const l of loans) {
    if (l.status === "Dipinjam" && l.end < now) {
      l.status = "Terlambat";
      l.history.push({ status: "Terlambat", at: stamp(), by: "Sistem", note: "Melewati tanggal kembali." });
      pushNotif(notifs, { userId: l.userId, roles: ["Admin"], kind: "overdue", title: "Peminjaman terlambat", message: `${l.id} melewati tanggal kembali.` });
      changed = true;
    } else if (l.status === "Disetujui" && addDays(l.start, rules.pickupDeadlineDaysAfterStart) < now) {
      l.status = "Kedaluwarsa";
      l.history.push({ status: "Kedaluwarsa", at: stamp(), by: "Sistem", note: "Barang tidak diambil tepat waktu." });
      pushNotif(notifs, { userId: l.userId, kind: "rejected", title: "Booking kedaluwarsa", message: `${l.id} tidak diambil sebelum batas pengambilan.` });
      changed = true;
    } else if (l.status === "Dipinjam" && l.end === addDays(now, 1) && l.remindedFor !== l.end) {
      l.remindedFor = l.end;
      pushNotif(notifs, { userId: l.userId, kind: "reminder", title: "Pengingat: kembalikan besok", message: `${l.id} harus dikembalikan besok.` });
      changed = true;
    }
  }
  if (changed) await Promise.all([write("loans", loans), write("notifs", notifs.slice(0, 1000))]);
};
