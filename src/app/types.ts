// ─── Tipi, costanti e helper condivisi ───────────────────────────────────────

export type Person = { id: string; name: string; color: string; tags?: string[]; allergies?: string; notes?: string };
export type TableShape = "rect" | "round";
export type TableData = {
  id: string;
  name: string;
  topSeats: (string | null)[];
  bottomSeats: (string | null)[];
  x: number;
  y: number;
  // Tipo di tavolo. Assente = "rect" (default storico). Per "round" si usa la
  // sola corona di sedie in topSeats (bottomSeats vuoto).
  shape?: TableShape;
  // Rotazione in gradi (solo tavoli rettangolari). Assente = 0.
  rotation?: number;
};
export type DragSrc =
  | { type: "pool" }
  | { type: "seat"; tableId: string; row: "top" | "bottom"; idx: number };
export type SelectInfo = { personId: string; src: DragSrc };
export type Shape = { id: string; x: number; y: number; w: number; h: number; label: string; color: string; fontSize?: number };
export type Page = { id: string; name: string; tables: TableData[]; shapes?: Shape[] };
export type TagDef = { name: string; color: string; icon?: string };
export type ListFilter = "all" | "free" | "assigned" | `tag:${string}`;

// ─── Costanti ─────────────────────────────────────────────────────────────────

export const SEAT_W = 144;
export const SEAT_H = 48;
export const SEAT_GAP = 4;

export const DEFAULT_TAG_DEFS: TagDef[] = [
  { name: "VIP",        color: "#f59e0b", icon: "crown" },
  { name: "Family",     color: "#3b82f6", icon: "heart" },
  { name: "Friends",    color: "#10b981", icon: "star" },
  { name: "Vegetarian", color: "#8b5cf6", icon: "droplet" },
];
export const TAG_PALETTE = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#ec4899", "#14b8a6", "#6366f1"];

export const SHAPE_PALETTE = ["#64748b", "#d97706", "#16a34a", "#2563eb", "#db2777", "#9333ea", "#dc2626"];
// Taglie di testo predefinite per le zone (label mostrata nella select).
export const ZONE_TEXT_SIZES = [
  { label: "S", value: 14 },
  { label: "M", value: 20 },
  { label: "L", value: 28 },
  { label: "XL", value: 40 },
];

export const COLORS = [
  "#7ae8ea", "#f8baff", "#ffcaba", "#7aea85",
  "#ffd966", "#c9b1f7", "#ff9da7", "#aad8f0",
];

export const STORAGE_KEY = "tavoli_state_v1";

// ─── Dati iniziali (vuoti: ogni utente parte da zero) ─────────────────────────

export const MASTER_PEOPLE: Person[] = [];
export const DEFAULT_TAGS: Record<string, string[]> = {};
export const DEFAULT_CUSTOM_PEOPLE: Person[] = [];

// Tavoli iniziali di esempio (vuoti). Usati per la prima pagina e per New page.
export const makeFreshTables = (): TableData[] => [
  { id: "t_a", name: "Table 1", x: 120, y: 120, topSeats: Array(8).fill(null), bottomSeats: Array(8).fill(null) },
  { id: "t_b", name: "Table 2", x: 120, y: 460, topSeats: Array(8).fill(null), bottomSeats: Array(8).fill(null) },
];
export const DEFAULT_TABLES: TableData[] = makeFreshTables();

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _uid = 500;
export const uid = () => `id${_uid++}`;

// Evita collisioni: alza il contatore oltre il massimo id "id<N>" già esistente
// (pagine, tavoli, forme, invitati custom). Va chiamata dopo l'idratazione.
export const bumpUidPast = (ids: Iterable<string>) => {
  for (const id of ids) {
    const m = /^id(\d+)$/.exec(id);
    if (m) { const n = +m[1]; if (n >= _uid) _uid = n + 1; }
  }
};
export const collectIds = (pages: Page[], people: Record<string, Person>): string[] => {
  const out = Object.keys(people);
  for (const p of pages) {
    out.push(p.id);
    for (const t of p.tables) out.push(t.id);
    for (const s of p.shapes ?? []) out.push(s.id);
  }
  return out;
};

export const normalizeStr = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
