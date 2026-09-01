import React, { useState, useEffect, useRef, useMemo, useCallback, DragEvent, ReactNode, MouseEvent as RMouseEvent } from "react";
import { Plus, Trash2, X, Pencil, Check, Search, Users, UserCheck, CircleDashed, GripVertical, ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight, Copy, Sparkles, Mail, Wine, Leaf, ArrowUpDown, ArrowLeftRight, UserPlus, Table2, Cloud, CloudOff, PanelLeft, PanelRight, Circle, RectangleHorizontal, Download, Upload, Tags as TagsIcon, SquarePlus } from "lucide-react";

// ─── Icona "vector-square" (zone/aree): quadrato con nodi agli angoli, stile
// Figma. Ricreata inline perché non presente in questa versione di lucide. ──────
function VectorSquare({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="4" height="4" rx="0.5" />
      <rect x="17" y="3" width="4" height="4" rx="0.5" />
      <rect x="3" y="17" width="4" height="4" rx="0.5" />
      <rect x="17" y="17" width="4" height="4" rx="0.5" />
      <line x1="7" y1="5" x2="17" y2="5" />
      <line x1="7" y1="19" x2="17" y2="19" />
      <line x1="5" y1="7" x2="5" y2="17" />
      <line x1="19" y1="7" x2="19" y2="17" />
    </svg>
  );
}

// ─── Tooltip globale: i tooltip nativi (attributo title) compaiono con forte
// ritardo o non compaiono. Questo componente, montato una volta a livello di
// root, intercetta l'hover su qualsiasi elemento con `title`, ne "adotta" il
// testo (spostandolo in data-tip così il tooltip nativo non parte) e mostra una
// pill scura dopo un breve delay. Funziona anche su elementi resi dinamicamente
// (modali, toolbar flottanti) perché ascolta sull'intero document. ──────────────
function GlobalTooltip() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; place: "top" | "bottom" } | null>(null);
  const timer = useRef<number | null>(null);
  const currentEl = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const DELAY = 550;
    const clearTimer = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
    const hide = () => { clearTimer(); currentEl.current = null; setTip(null); };

    const onOver = (e: globalThis.MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.("[title],[data-tip]") as HTMLElement | null;
      if (!el) return;
      // Sposta title → data-tip per disattivare il tooltip nativo.
      const native = el.getAttribute("title");
      if (native) { el.setAttribute("data-tip", native); el.removeAttribute("title"); }
      const text = el.getAttribute("data-tip");
      if (!text) return;
      if (currentEl.current === el) return;
      currentEl.current = el;
      clearTimer();
      timer.current = window.setTimeout(() => {
        const r = el.getBoundingClientRect();
        const place: "top" | "bottom" = r.top > 46 ? "top" : "bottom";
        const x = Math.min(Math.max(r.left + r.width / 2, 10), window.innerWidth - 10);
        const y = place === "top" ? r.top - 8 : r.bottom + 8;
        setTip({ text, x, y, place });
      }, DELAY);
    };
    const onOut = (e: globalThis.MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (currentEl.current && related && currentEl.current.contains(related)) return;
      hide();
    };
    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mouseout", onOut, true);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("wheel", hide, true);
    return () => {
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mouseout", onOut, true);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("wheel", hide, true);
      clearTimer();
    };
  }, []);

  if (!tip) return null;
  return (
    <div style={{
      position: "fixed", left: tip.x, top: tip.y,
      transform: tip.place === "top" ? "translate(-50%,-100%)" : "translate(-50%,0)",
      background: "#1f2937", color: "#fff", fontSize: 11.5, fontWeight: 600, lineHeight: 1.3,
      padding: "4px 8px", borderRadius: 7, whiteSpace: "nowrap", pointerEvents: "none",
      zIndex: 9999, boxShadow: "0 6px 18px rgba(0,0,0,0.22)",
    }}>
      {tip.text}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Person = { id: string; name: string; color: string; tags?: string[] };
type TableShape = "rect" | "round";
type TableData = {
  id: string;
  name: string;
  topSeats: (string | null)[];
  bottomSeats: (string | null)[];
  x: number;
  y: number;
  // Tipo di tavolo. Assente = "rect" (default storico). Per "round" si usa la
  // sola corona di sedie in topSeats (bottomSeats vuoto).
  shape?: TableShape;
};
type DragSrc =
  | { type: "pool" }
  | { type: "seat"; tableId: string; row: "top" | "bottom"; idx: number };
type SelectInfo = { personId: string; src: DragSrc };
type Shape = { id: string; x: number; y: number; w: number; h: number; label: string; color: string; fontSize?: number };
type Page = { id: string; name: string; tables: TableData[]; shapes?: Shape[] };

// ─── Constants ────────────────────────────────────────────────────────────────

const SEAT_W = 144;
const SEAT_H = 48;
const SEAT_GAP = 4;

// Tag personalizzabili dall'utente (nome + colore). Gestiti in stato/localStorage.
type TagDef = { name: string; color: string };
const DEFAULT_TAG_DEFS: TagDef[] = [
  { name: "VIP",        color: "#f59e0b" },
  { name: "Family",     color: "#3b82f6" },
  { name: "Friends",    color: "#10b981" },
  { name: "Vegetarian", color: "#8b5cf6" },
];
const TAG_PALETTE = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#ec4899", "#14b8a6", "#6366f1"];

const SHAPE_PALETTE = ["#64748b","#d97706","#16a34a","#2563eb","#db2777","#9333ea","#dc2626"];
// Taglie di testo predefinite per le zone (label mostrata nella select).
const ZONE_TEXT_SIZES = [
  { label: "S", value: 14 },
  { label: "M", value: 20 },
  { label: "L", value: 28 },
  { label: "XL", value: 40 },
];

const COLORS = [
  "#7ae8ea", "#f8baff", "#ffcaba", "#7aea85",
  "#ffd966", "#c9b1f7", "#ff9da7", "#aad8f0",
];


// ─── Dati iniziali (vuoti: ogni utente parte da zero) ─────────────────────────

const MASTER_PEOPLE: Person[] = [];
const DEFAULT_TAGS: Record<string, string[]> = {};
const DEFAULT_CUSTOM_PEOPLE: Person[] = [];

// Tavoli iniziali di esempio (vuoti). Usati per la prima pagina e per New page.
const makeFreshTables = (): TableData[] => [
  { id: "t_a", name: "Table 1", x: 120, y: 120, topSeats: Array(8).fill(null), bottomSeats: Array(8).fill(null) },
  { id: "t_b", name: "Table 2", x: 120, y: 460, topSeats: Array(8).fill(null), bottomSeats: Array(8).fill(null) },
];
const DEFAULT_TABLES: TableData[] = makeFreshTables();

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _uid = 500;
const uid = () => `id${_uid++}`;

// Evita collisioni: alza il contatore oltre il massimo id "id<N>" già esistente
// (pagine, tavoli, forme, invitati custom). Va chiamata dopo l'idratazione.
const bumpUidPast = (ids: Iterable<string>) => {
  for (const id of ids) {
    const m = /^id(\d+)$/.exec(id);
    if (m) { const n = +m[1]; if (n >= _uid) _uid = n + 1; }
  }
};
const collectIds = (pages: Page[], people: Record<string, Person>): string[] => {
  const out = Object.keys(people);
  for (const p of pages) {
    out.push(p.id);
    for (const t of p.tables) out.push(t.id);
    for (const s of p.shapes ?? []) out.push(s.id);
  }
  return out;
};

const normalizeStr = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} title="Close" className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── EditPersonModal ──────────────────────────────────────────────────────────

function EditPersonModal({ person, onSave, onDelete, onClose, tagDefs, onManageTags }: {
  person: Person;
  onSave: (name: string, color: string, tags: string[]) => void;
  onDelete: () => void;
  onClose: () => void;
  tagDefs: TagDef[];
  onManageTags: () => void;
}) {
  const [name, setName] = useState(person.name);
  const [color, setColor] = useState(person.color);
  const [tags, setTags] = useState<string[]>(person.tags ?? []);

  const toggle = (tag: string) =>
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  return (
    <Modal title="Edit person" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Full name</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && name.trim() && onSave(name.trim(), color, tags)}
            className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Color</label>
          <div className="mt-1.5 flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} title="Pick color"
                className={["w-8 h-8 rounded-lg border-2 transition-all", color === c ? "border-gray-800 scale-110 shadow-md" : "border-transparent hover:scale-105"].join(" ")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="mt-2 rounded-xl px-4 py-2 text-sm font-bold text-gray-900 text-center shadow-sm truncate" style={{ backgroundColor: color }}>
            {name || "Preview"}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Tags</label>
            <button onClick={onManageTags} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Manage tags</button>
          </div>
          <div className="mt-1.5 flex gap-2 flex-wrap">
            {tagDefs.length === 0 && <span className="text-xs text-gray-400">No tags yet — click "Manage tags".</span>}
            {tagDefs.map(({ name, color }) => {
              const active = tags.includes(name);
              return (
                <button key={name} onClick={() => toggle(name)}
                  title={active ? `Remove "${name}" tag` : `Add "${name}" tag`}
                  className={[
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                    active ? "text-white border-transparent shadow-sm" : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300",
                  ].join(" ")}
                  style={active ? { backgroundColor: color, borderColor: color } : {}}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? "#fff" : color }} />
                  {name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onDelete} className="px-3 py-2.5 rounded-xl border border-red-200 text-sm text-red-500 hover:bg-red-50 font-medium transition-colors">
            Delete
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-medium">
            Cancel
          </button>
          <button onClick={() => name.trim() && onSave(name.trim(), color, tags)} disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-40">
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── ManageTagsModal — CRUD dei tag (nome + colore) ───────────────────────────

function ManageTagsModal({ tagDefs, onAdd, onRename, onColor, onDelete, onClose }: {
  tagDefs: TagDef[];
  onAdd: (name: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onColor: (name: string, color: string) => void;
  onDelete: (name: string) => void;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const add = () => { if (newName.trim()) { onAdd(newName); setNewName(""); } };
  return (
    <Modal title="Manage tags" onClose={onClose}>
      <div className="space-y-3">
        {tagDefs.length === 0 && <p className="text-xs text-gray-400">No tags yet. Add one below.</p>}
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {tagDefs.map(t => (
            <div key={t.name} className="flex items-center gap-2">
              <div className="flex items-center gap-1 shrink-0">
                {TAG_PALETTE.map(c => (
                  <button key={c} onClick={() => onColor(t.name, c)} title="Color"
                    className="w-5 h-5 rounded-full border-2 box-border transition-opacity hover:opacity-70"
                    style={{ backgroundColor: c, borderColor: t.color === c ? "#111827" : "transparent" }} />
                ))}
              </div>
              <input defaultValue={t.name} key={t.name + t.color}
                onBlur={e => { const v = e.target.value.trim(); if (v && v !== t.name) onRename(t.name, v); }}
                onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <button onClick={() => onDelete(t.name)} title="Delete tag"
                className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") add(); }}
            placeholder="New tag name"
            className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
          <button onClick={add} disabled={!newName.trim()}
            className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 flex items-center gap-1 shrink-0">
            <Plus size={14} /> Add
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── InlineEditText — rename inline: il campo "abbraccia" il testo e le metriche
// di lettura/modifica sono identiche (stesso padding + bordo trasparente→blu),
// così non c'è alcuno spostamento passando da lettura a modifica. ───────────────

function InlineEditText({
  value, onCommit, textStyle, placeholder = "", center = false, title, trigger = "click",
  wrap = false, maxWidth, grow = false,
}: {
  value: string;
  onCommit: (v: string) => void;
  textStyle?: React.CSSProperties;
  placeholder?: string;
  center?: boolean;
  title?: string;
  trigger?: "click" | "dblclick";
  wrap?: boolean;
  maxWidth?: number;
  grow?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  // Box condiviso: stesso padding e stesso spessore bordo in entrambi gli stati.
  const box: React.CSSProperties = {
    ...textStyle,
    gridArea: "1 / 1 / 2 / 2",
    padding: "2px 6px",
    border: "1px solid transparent",
    borderRadius: 6,
    boxSizing: "border-box",
    whiteSpace: wrap ? "normal" : "pre",
    wordBreak: wrap ? "break-word" : undefined,
    textAlign: center ? "center" : "left",
  };

  const start = () => { setDraft(value); setEditing(true); };
  const commit = () => { const v = draft.trim(); if (v && v !== value) onCommit(v); setEditing(false); };

  const readHandlers = trigger === "click"
    ? { onMouseDown: (e: RMouseEvent) => e.stopPropagation(), onClick: (e: RMouseEvent) => { e.stopPropagation(); start(); } }
    : { onDoubleClick: (e: RMouseEvent) => { e.stopPropagation(); start(); } };

  // Modalità "grow": riempie il contenitore e tronca con ellipsis (niente hug,
  // niente overflow orizzontale). Usata dove lo spazio è fisso (es. sidebar).
  if (grow) {
    const gbox: React.CSSProperties = {
      ...textStyle, padding: "2px 6px", border: "1px solid transparent", borderRadius: 6,
      boxSizing: "border-box", whiteSpace: "nowrap", textAlign: center ? "center" : "left",
      display: "block", width: "100%",
    };
    return (
      <span style={{ display: "block", width: "100%", minWidth: 0 }}>
        {editing ? (
          <input autoFocus value={draft}
            onChange={e => setDraft(e.target.value)} onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter") commit(); else if (e.key === "Escape") setEditing(false); e.stopPropagation(); }}
            onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
            style={{ ...gbox, border: "1px solid #3b82f6", background: "white", outline: "none", minWidth: 0 }}
          />
        ) : (
          <span title={title} {...readHandlers}
            style={{ ...gbox, cursor: trigger === "click" ? "text" : "inherit", opacity: value ? 1 : 0.4, overflow: "hidden", textOverflow: "ellipsis" }}>
            {value || placeholder}
          </span>
        )}
      </span>
    );
  }

  return (
    <span style={{ display: "inline-grid", alignItems: "center", justifyItems: center ? "center" : "start", maxWidth: maxWidth ?? "100%" }}>
      {/* Sizer invisibile: impone la larghezza (hug sul testo corrente).
          In modifica segue SOLO il testo digitato (nessuna larghezza minima
          dovuta al placeholder). */}
      <span aria-hidden style={{ ...box, visibility: "hidden" }}>
        {editing ? (draft || " ") : (value || placeholder || " ")}
      </span>
      {editing ? (
        <input
          autoFocus
          size={1}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Enter") commit(); else if (e.key === "Escape") setEditing(false); e.stopPropagation(); }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          style={{ ...box, border: "1px solid #3b82f6", background: "white", outline: "none", width: "100%", minWidth: 0 }}
        />
      ) : (
        <span
          title={title}
          {...(trigger === "click"
            ? { onMouseDown: (e: RMouseEvent) => e.stopPropagation(), onClick: (e: RMouseEvent) => { e.stopPropagation(); start(); } }
            : { onDoubleClick: (e: RMouseEvent) => { e.stopPropagation(); start(); } })}
          style={{ ...box, cursor: trigger === "click" ? "text" : "inherit", opacity: value ? 1 : 0.4, width: "100%", ...(wrap ? {} : { overflow: "hidden", textOverflow: "ellipsis" }) }}
        >
          {value || placeholder}
        </span>
      )}
    </span>
  );
}

// ─── TableCard ────────────────────────────────────────────────────────────────

function TableCard({
  table, people, draggingId, dragOverKey, selected,
  onSeatDragOver, onSeatDrop, onPersonDragStart, onPersonDragEnd,
  onSeatClick, onGapDragOver, onGapDrop, onGapClick,
  onAdjust, onRemoveSlot, onDelete, onRename, onStartTableDrag, onPersonClick, onFlip, onFlipH,
  zoom, isSelected, onSelect, willFreeOnRelease, onTableAreaDragOver, onTableAreaDrop, tagColor,
}: {
  table: TableData;
  people: Record<string, Person>;
  draggingId: string | null;
  dragOverKey: string | null;
  selected: SelectInfo | null;
  onSeatDragOver: (e: DragEvent<HTMLDivElement>, key: string) => void;
  onSeatDrop: (e: DragEvent<HTMLDivElement>, tableId: string, row: "top" | "bottom", idx: number) => void;
  onPersonDragStart: (e: DragEvent<HTMLDivElement>, personId: string, src: DragSrc) => void;
  onPersonDragEnd: () => void;
  onSeatClick: (tableId: string, row: "top" | "bottom", idx: number) => void;
  onPersonClick: (personId: string) => void;
  onGapDragOver: (e: DragEvent<HTMLDivElement>, key: string) => void;
  onGapDrop: (e: DragEvent<HTMLDivElement>, tableId: string, row: "top" | "bottom", afterIdx: number) => void;
  onGapClick: (tableId: string, row: "top" | "bottom", afterIdx: number) => void;
  onAdjust: (tableId: string, row: "top" | "bottom", delta: number) => void;
  onRemoveSlot: (tableId: string, row: "top" | "bottom", idx: number) => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onStartTableDrag: (e: RMouseEvent<HTMLDivElement>) => void;
  onFlip: () => void;
  onFlipH: () => void;
  zoom: number;
  isSelected: boolean;
  onSelect: () => void;
  willFreeOnRelease: boolean;
  onTableAreaDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onTableAreaDrop: (e: DragEvent<HTMLDivElement>) => void;
  tagColor: (name: string) => string;
}) {
  const occupied = [...table.topSeats, ...table.bottomSeats].filter(Boolean).length;
  const total = table.topSeats.length + table.bottomSeats.length;
  const maxCols = Math.max(table.topSeats.length, table.bottomSeats.length);

  const isDragging = !!draggingId;
  const hasSelected = !!selected;

  const renderSeat = (row: "top" | "bottom", personId: string | null, idx: number, dims?: { w: number; h: number }) => {
    const person = personId ? people[personId] : null;
    const key = `${table.id}|${row}|${idx}`;
    const isOver = dragOverKey === key;
    const isDraggingThis = draggingId === personId && !!personId;
    const isSelected = selected?.personId === personId && !!personId;
    // Distinguish: hovering over an occupied seat = REPLACE (orange), empty = PLACE (green)
    const willReplace = isOver && !!person && isDragging;
    const canPlace    = isOver && !person && isDragging;

    return (
      <div
        key={key}
        data-seat="1"
        style={{ width: dims?.w ?? SEAT_W, height: dims?.h ?? SEAT_H, flexShrink: 0 }}
        className={[
          "relative rounded-lg transition-all duration-100 cursor-pointer select-none",
          person ? "" : "border-2 border-dashed",
          !person && canPlace  ? "border-green-400 bg-green-50" :
          !person && hasSelected && !isSelected ? "border-blue-300 bg-blue-50/60" :
          !person ? "border-gray-200 hover:border-gray-300" : "",
          willReplace ? "ring-2 ring-orange-400 ring-offset-1" : "",
          canPlace    ? "ring-2 ring-green-400 ring-offset-1" : "",
        ].filter(Boolean).join(" ")}
        onDragOver={e => onSeatDragOver(e, key)}
        onDrop={e => onSeatDrop(e, table.id, row, idx)}
        onClick={() => onSeatClick(table.id, row, idx)}
      >
        {/* Replace overlay */}
        {willReplace && (
          <div className="absolute inset-0 rounded-lg bg-orange-400/20 flex items-center justify-center z-10 pointer-events-none">
            <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shadow">
              <span className="text-white text-[10px] font-black leading-none">↔</span>
            </div>
          </div>
        )}
        {person ? (
          <div
            draggable
            onDragStart={e => onPersonDragStart(e, person.id, { type: "seat", tableId: table.id, row, idx })}
            onDragEnd={onPersonDragEnd}
            onClick={e => { e.stopPropagation(); onPersonClick(person.id); }}
            title={`${person.name} — click to edit, drag to move`}
            style={{ backgroundColor: person.color }}
            className={[
              "absolute inset-0 rounded-lg flex flex-col items-center justify-center px-1.5 overflow-hidden",
              "cursor-grab active:cursor-grabbing transition-all duration-100",
              isDraggingThis ? "opacity-30 scale-95" : "opacity-100",
              isSelected ? "ring-2 ring-blue-500 ring-offset-1 shadow-md" : "shadow-sm hover:shadow-md hover:-translate-y-px",
            ].filter(Boolean).join(" ")}
          >
            <span className="text-[11px] font-bold text-gray-900 text-center leading-tight truncate w-full text-center">
              {person.name}
            </span>
            {person.tags && person.tags.length > 0 && (
              <div className="flex gap-1 mt-0.5">
                {person.tags.map(tag => (
                  <span key={tag} className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tagColor(tag), boxShadow: "0 0 0 1.5px white" }} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center group/empty">
            <span className="text-[10px] text-gray-300 font-medium group-hover/empty:opacity-0 transition-opacity">
              {idx + 1}
            </span>
            <button
              onClick={e => { e.stopPropagation(); onRemoveSlot(table.id, row, idx); }}
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/empty:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
              title="Remove slot"
            >
              <X size={13} />
            </button>
          </div>
        )}
        {/* Persona trascinata fuori (posizione di rimozione): cestino a piena opacità */}
        {isDraggingThis && willFreeOnRelease && (
          <div className="absolute inset-0 rounded-lg bg-red-500 flex items-center justify-center z-20 pointer-events-none shadow-md">
            <Trash2 size={18} className="text-white" />
          </div>
        )}
      </div>
    );
  };

  const GAP_NORMAL = 8;  // px — layout width of each gap zone

  const renderGap = (row: "top" | "bottom", afterIdx: number) => {
    const key = `G|${table.id}|${row}|${afterIdx}`;
    const isOver = dragOverKey === key;
    const showInsert = isOver && isDragging;
    const showClickTarget = hasSelected && !isDragging;

    return (
      <div
        key={key}
        style={{ width: GAP_NORMAL, height: SEAT_H, flexShrink: 0, position: "relative" }}
        className={showClickTarget ? "cursor-pointer" : ""}
        onDragOver={e => onGapDragOver(e, key)}
        onDrop={e => onGapDrop(e, table.id, row, afterIdx)}
        onClick={() => onGapClick(table.id, row, afterIdx)}
      >
        {/* Invisible wider hit area so the gap is easier to target */}
        <div style={{ position: "absolute", inset: "0 -6px", zIndex: 5 }} />
        {/* Blue insert line */}
        {showInsert && (
          <div style={{
            position: "absolute", left: "50%", top: 2, bottom: 2,
            width: 3, transform: "translateX(-50%)",
            borderRadius: 4, zIndex: 20,
            background: "linear-gradient(180deg,#3b82f6,#6366f1)",
            boxShadow: "0 0 8px 2px rgba(99,102,241,0.5)",
          }} />
        )}
        {/* Click-to-insert line (softer) */}
        {showClickTarget && !showInsert && (
          <div style={{
            position: "absolute", left: "50%", top: 4, bottom: 4,
            width: 2, transform: "translateX(-50%)",
            borderRadius: 4, zIndex: 10,
            background: "rgba(59,130,246,0.25)",
          }} />
        )}
      </div>
    );
  };

  // ── Tavolo ROTONDO: corona di sedie in topSeats attorno a un disco ──────────
  if (table.shape === "round") {
    const ring = table.topSeats;
    const N = Math.max(ring.length, 1);
    const seatW = 128, seatH = 44, gap = 16;
    const radius = N <= 1 ? 84 : Math.max(84, (seatW + gap) / (2 * Math.sin(Math.PI / N)));
    const box = 2 * radius + seatW + 8;
    const c = box / 2;
    const discD = Math.max(72, 2 * radius - seatH - 8);
    return (
      <div
        style={{ position: "absolute", left: table.x, top: table.y, zIndex: isSelected ? 2 : 1,
          width: box, height: box, borderRadius: 28,
          border: `2px solid ${isSelected ? "#3b82f6" : "transparent"}`, boxSizing: "border-box", cursor: "grab" }}
        onMouseDown={e => { if (!(e.target as HTMLElement).closest("[data-seat]")) onStartTableDrag(e); }}
        onDragOver={e => { if (draggingId) onTableAreaDragOver(e); }}
        onDrop={onTableAreaDrop}
      >
        {/* Superficie del tavolo (disco centrale) */}
        <div style={{ position: "absolute", left: c - discD / 2, top: c - discD / 2, width: discD, height: discD,
          borderRadius: "50%", background: "#fff", border: "1px solid #e5e7eb", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }} />
        {/* Sedie disposte in cerchio */}
        {ring.map((pid, i) => {
          const ang = -Math.PI / 2 + (i * 2 * Math.PI) / N;
          const sx = c + radius * Math.cos(ang) - seatW / 2;
          const sy = c + radius * Math.sin(ang) - seatH / 2;
          return (
            <div key={i} style={{ position: "absolute", left: sx, top: sy }}>
              {renderSeat("top", pid, i, { w: seatW, h: seatH })}
            </div>
          );
        })}
        {/* Zone di inserimento tra sedie adiacenti (riordino nell'anello) —
            attive solo durante un drag; indicatore blu radiale al passaggio */}
        {ring.map((_, i) => {
          const afterIdx = i + 1;
          const mid = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / N;
          const gx = c + radius * Math.cos(mid);
          const gy = c + radius * Math.sin(mid);
          const key = `G|${table.id}|top|${afterIdx}`;
          const showInsert = dragOverKey === key && isDragging;
          const HZ = 36;
          return (
            <div key={`g${i}`}
              style={{ position: "absolute", left: gx - HZ / 2, top: gy - HZ / 2, width: HZ, height: HZ, zIndex: 8, pointerEvents: isDragging ? "auto" : "none" }}
              onDragOver={e => onGapDragOver(e, key)}
              onDrop={e => onGapDrop(e, table.id, "top", afterIdx)}
            >
              {showInsert && (
                <div style={{
                  position: "absolute", left: "50%", top: "50%",
                  width: 4, height: seatH, transform: `translate(-50%,-50%) rotate(${(mid * 180) / Math.PI + 90}deg)`,
                  borderRadius: 4, background: "linear-gradient(180deg,#3b82f6,#6366f1)",
                  boxShadow: "0 0 8px 2px rgba(99,102,241,0.5)",
                }} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl shadow-lg"
      style={{ position: "absolute", left: table.x, top: table.y, zIndex: isSelected ? 2 : 1, border: `2px solid ${isSelected ? "#3b82f6" : "#e5e7eb"}`, cursor: "grab" }}
      onMouseDown={e => { if (!(e.target as HTMLElement).closest("[data-seat]")) onStartTableDrag(e); }}
      onDragOver={e => { if (draggingId) onTableAreaDragOver(e); }}
      onDrop={onTableAreaDrop}
    >
      <div className="p-5">
        <div style={{ display: "inline-block" }}>
          {/* Top row with gap zones */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {renderGap("top", 0)}
            {table.topSeats.map((pid, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                {renderSeat("top", pid, i)}
                {renderGap("top", i + 1)}
              </div>
            ))}
          </div>

          {/* Table divider */}
          <div className="relative my-4">
          </div>

          {/* Bottom row with gap zones */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {renderGap("bottom", 0)}
            {table.bottomSeats.map((pid, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                {renderSeat("bottom", pid, i)}
                {renderGap("bottom", i + 1)}
              </div>
            ))}
          </div>

          {/* Seat numbers — aligned under each seat */}
          <div style={{ display: "flex", marginTop: 6 }}>
            <div style={{ width: GAP_NORMAL, flexShrink: 0 }} />
            {Array.from({ length: maxCols }).map((_, i) => (
              <div key={i} style={{ display: "flex" }}>
                <div style={{ width: SEAT_W, flexShrink: 0 }} className="text-center text-[10px] text-gray-300 font-medium">{i + 1}</div>
                <div style={{ width: GAP_NORMAL, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TableChrome — titolo + toolbar del tavolo, resi in un layer SOPRA tutti i
// frame così i titoli non vengono mai coperti dai tavoli vicini. ────────────────

function TableChrome({
  table, occupied, total, zoom, isSelected,
  onSelect, onStartTableDrag, onRename, onAdjust, onFlip, onFlipH, onDelete,
}: {
  table: TableData;
  occupied: number;
  total: number;
  zoom: number;
  isSelected: boolean;
  onSelect: () => void;
  onStartTableDrag: (e: RMouseEvent<HTMLDivElement>) => void;
  onRename: (name: string) => void;
  onAdjust: (tableId: string, row: "top" | "bottom", delta: number) => void;
  onFlip: () => void;
  onFlipH: () => void;
  onDelete: () => void;
}) {
  const isRound = table.shape === "round";
  return (
    <div style={{ position: "absolute", left: table.x, top: table.y }}>
      {/* Contro-scala per dimensione costante a ogni zoom; ancorato sopra il frame */}
      <div style={{ position: "absolute", left: 0, bottom: "100%", transformOrigin: "left bottom", transform: `scale(${1 / zoom})`, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, paddingBottom: 6, pointerEvents: "auto" }}>
        {isSelected && (
          <div className="flex items-center gap-1.5 bg-white rounded-xl shadow-lg border border-gray-200 px-2 h-11" onMouseDown={e => e.stopPropagation()}>
            <span className="text-xs text-gray-400 font-medium px-1 tabular-nums">{occupied}/{total}</span>
            <div className="w-px h-5 bg-gray-200" />
            {isRound ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400 font-semibold px-1">Seats</span>
                <button onClick={() => onAdjust(table.id, "top", -1)} title="Remove a seat" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 text-lg leading-none font-bold">−</button>
                <span className="w-5 text-center text-sm font-bold text-gray-700">{table.topSeats.length}</span>
                <button onClick={() => onAdjust(table.id, "top", 1)} title="Add a seat" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 text-lg leading-none font-bold">+</button>
              </div>
            ) : (
              <>
                {(["top", "bottom"] as const).map(row => (
                  <div key={row} className="flex items-center gap-1">
                    <span className="text-xs text-gray-400 font-semibold w-3 text-center">{row === "top" ? "A" : "B"}</span>
                    <button onClick={() => onAdjust(table.id, row, -1)} title={`Remove a seat from row ${row === "top" ? "A" : "B"}`} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 text-lg leading-none font-bold">−</button>
                    <span className="w-5 text-center text-sm font-bold text-gray-700">{row === "top" ? table.topSeats.length : table.bottomSeats.length}</span>
                    <button onClick={() => onAdjust(table.id, row, 1)} title={`Add a seat to row ${row === "top" ? "A" : "B"}`} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 text-lg leading-none font-bold">+</button>
                  </div>
                ))}
                <div className="w-px h-5 bg-gray-200" />
                <button onClick={onFlipH} title="Flip horizontal" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"><ArrowLeftRight size={18} /></button>
                <button onClick={onFlip} title="Flip vertical" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"><ArrowUpDown size={18} /></button>
              </>
            )}
            <div className="w-px h-5 bg-gray-200" />
            <button onClick={onDelete} title="Delete table" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={18} /></button>
          </div>
        )}
        {/* Titolo: trascina + seleziona (rename su doppio click) */}
        <div onMouseDown={onStartTableDrag} onClick={onSelect} style={{ cursor: "grab", maxWidth: 360, display: "flex", alignItems: "center", gap: 4 }}>
          <GripVertical size={13} className="shrink-0" style={{ color: isSelected ? "#2563eb" : "#9ca3af" }} />
          <InlineEditText value={table.name} onCommit={onRename} trigger="dblclick" title="Double-click to rename" textStyle={{ fontSize: 13, fontWeight: 600, color: isSelected ? "#2563eb" : "#6b7280" }} />
        </div>
      </div>
    </div>
  );
}

// ─── PageItem ─────────────────────────────────────────────────────────────────

function PageItem({ page, isActive, onSwitch, onRename, onContextMenu }: {
  page: Page; isActive: boolean;
  onSwitch: () => void; onRename: (name: string) => void;
  onContextMenu: (x: number, y: number) => void;
}) {
  return (
    <div
      onClick={onSwitch}
      onContextMenu={e => { e.preventDefault(); onContextMenu(e.clientX, e.clientY); }}
      className={[
        "group flex items-center gap-1.5 px-2 py-1.5 mx-1 my-0.5 rounded-lg cursor-pointer select-none transition-colors",
        isActive ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100 text-gray-700",
      ].join(" ")}
    >
      <div className="flex-1 min-w-0 text-xs">
        <InlineEditText
          value={page.name}
          onCommit={onRename}
          trigger="dblclick"
          grow
          title="Double-click to rename · right-click for options"
          textStyle={{ fontSize: 12, fontWeight: 500, color: "inherit" }}
        />
      </div>
    </div>
  );
}

// ─── SidebarToggle — stessa label + icona riusata sia come TITOLO (sidebar
// aperta, click = chiudi) sia come pulsante flottante (chiusa, click = apri). ────

function SidebarToggle({ label, side, open, onToggle, variant }: {
  label: string;
  side: "left" | "right";
  open: boolean;
  onToggle: () => void;
  variant: "header" | "floating";
}) {
  const Icon = side === "left" ? PanelLeft : PanelRight;
  const icon = <Icon size={variant === "floating" ? 19 : 19} className="shrink-0" />;
  const text = (
    <span className={variant === "header" ? "text-base font-medium" : "text-sm font-semibold"}>
      {label}
    </span>
  );
  const iconFirst = variant === "header" ? true : side === "left";
  return (
    <button onClick={onToggle} title={open ? `Hide ${label}` : `Show ${label}`}
      className={variant === "floating"
        ? "h-11 px-4 flex items-center gap-2.5 bg-white rounded-xl shadow-md border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        : "flex items-center gap-3.5 text-gray-800 hover:text-gray-900 transition-colors min-w-0"}>
      {iconFirst ? <>{icon}{text}</> : <>{text}{icon}</>}
    </button>
  );
}

// ─── Persistenza: locale nel browser (localStorage). I dati restano sul device
// di ogni utente e sopravvivono a refresh / riavvio del browser. ────────────────

const STORAGE_KEY = "tavoli_state_v1";

// ─── App ──────────────────────────────────────────────────────────────────────

type ListFilter = "all" | "free" | "assigned" | `tag:${string}`;

export default function App() {
  // ── State ──────────────────────────────────────────────────────────────────
  // Persistenza su API locale SQLite (server.js): lo stato iniziale usa i
  // default seed, poi viene idratato da GET /api/state al mount.

  const MASTER_IDS = new Set(MASTER_PEOPLE.map(p => p.id));

  const buildPeople = (
    tags: Record<string, string[]>,
    colorOverrides: Record<string, string>,
    customPeople: Person[],
  ): Record<string, Person> => {
    const base: Record<string, Person> = Object.fromEntries(MASTER_PEOPLE.map(p => [p.id, p]));
    Object.entries(tags).forEach(([id, t]) => { if (base[id]) base[id] = { ...base[id], tags: t }; });
    Object.entries(colorOverrides).forEach(([id, c]) => { if (base[id]) base[id] = { ...base[id], color: c }; });
    customPeople.forEach(p => { base[p.id] = p; });
    return base;
  };

  const [pages, setPages] = useState<Page[]>(() => [{ id: "page_1", name: "Draft 1", tables: DEFAULT_TABLES }]);

  const [currentPageId, setCurrentPageId] = useState<string>("page_1");

  const [people, setPeople] = useState<Record<string, Person>>(() => buildPeople(DEFAULT_TAGS, {}, DEFAULT_CUSTOM_PEOPLE));

  const currentPageIdRef = useRef(currentPageId);
  currentPageIdRef.current = currentPageId;

  // Derived tables for the active page
  const tables = useMemo(
    () => pages.find(p => p.id === currentPageId)?.tables ?? [],
    [pages, currentPageId]
  );

  // setTables: always updates the active page's tables (stable, uses ref)
  const setTables = useCallback((updater: TableData[] | ((prev: TableData[]) => TableData[])) => {
    setPages(prev => prev.map(p => {
      if (p.id !== currentPageIdRef.current) return p;
      const next = typeof updater === "function" ? updater(p.tables) : updater;
      return { ...p, tables: next };
    }));
  }, []);

  // Derived shapes for the active page
  const shapes = useMemo(
    () => pages.find(p => p.id === currentPageId)?.shapes ?? [],
    [pages, currentPageId]
  );

  const setShapes = useCallback((updater: Shape[] | ((prev: Shape[]) => Shape[])) => {
    setPages(prev => prev.map(p => {
      if (p.id !== currentPageIdRef.current) return p;
      const next = typeof updater === "function" ? updater(p.shapes ?? []) : updater;
      return { ...p, shapes: next };
    }));
  }, []);

  // ── History (undo/redo) ───────────────────────────────────────────────────
  const tablesRef = useRef(tables);
  tablesRef.current = tables;
  const undoStack = useRef<TableData[][]>([]);
  const redoStack = useRef<TableData[][]>([]);

  const pushHistory = useCallback(() => {
    undoStack.current.push(tablesRef.current);
    if (undoStack.current.length > 100) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const setTablesH = useCallback((updater: TableData[] | ((prev: TableData[]) => TableData[])) => {
    pushHistory();
    setTables(updater);
  }, [pushHistory, setTables]);

  const [dragInfo, setDragInfo] = useState<{ personId: string; src: DragSrc } | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectInfo | null>(null);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loaded, setLoaded] = useState(false);

  // Tag personalizzabili
  const [tagDefs, setTagDefs] = useState<TagDef[]>(DEFAULT_TAG_DEFS);
  const tagColor = useCallback((name: string) => tagDefs.find(t => t.name === name)?.color ?? "#9ca3af", [tagDefs]);
  const [tagsModalOpen, setTagsModalOpen] = useState(false);
  // Onboarding: mostrato solo alla prima visita
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return !localStorage.getItem("tavoli_onboarded_v1"); } catch { return false; }
  });
  const dismissWelcome = () => {
    try { localStorage.setItem("tavoli_onboarded_v1", "1"); } catch {}
    setShowWelcome(false);
  };
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Idratazione iniziale dal browser (localStorage) — i dati restano sul device
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const st = JSON.parse(raw) as { pages?: Page[]; people?: Record<string, Person>; currentPageId?: string; tags?: TagDef[] };
        if (Array.isArray(st.pages) && st.pages.length > 0) {
          const cur = st.currentPageId && st.pages.some(p => p.id === st.currentPageId)
            ? st.currentPageId : st.pages[0].id;
          const ppl = st.people ?? {};
          setPages(st.pages);
          setCurrentPageId(cur);
          setPeople(ppl);
          if (Array.isArray(st.tags)) setTagDefs(st.tags);
          bumpUidPast(collectIds(st.pages, ppl));
          return;
        }
      }
      // Nessun dato salvato: allinea il contatore ai default correnti.
      bumpUidPast(collectIds(pages, people));
    } catch (e) { console.warn("[load]", e); }
    finally { setLoaded(true); }
  }, []);

  // Salvataggio su localStorage a ogni modifica (debounced)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ pages, people, currentPageId, tags: tagDefs }));
        setSaveStatus("saved");
      } catch (e) { console.error("[save]", e); setSaveStatus("error"); }
    }, 400);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [pages, currentPageId, people, tagDefs, loaded]);

  // ── Import / Export JSON ────────────────────────────────────────────────────
  const exportData = () => {
    const blob = new Blob(
      [JSON.stringify({ pages, people, currentPageId, tags: tagDefs, version: 1 }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seating-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };
  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const st = JSON.parse(String(reader.result)) as { pages?: Page[]; people?: Record<string, Person>; currentPageId?: string; tags?: TagDef[] };
        if (!Array.isArray(st.pages) || st.pages.length === 0) throw new Error("bad");
        if (!window.confirm("Importing this file will replace your current data. Continue?")) return;
        const cur = st.currentPageId && st.pages.some(p => p.id === st.currentPageId) ? st.currentPageId : st.pages[0].id;
        const ppl = st.people ?? {};
        setPages(st.pages); setCurrentPageId(cur); setPeople(ppl);
        if (Array.isArray(st.tags)) setTagDefs(st.tags);
        bumpUidPast(collectIds(st.pages, ppl));
      } catch { window.alert("Invalid file: could not import."); }
    };
    reader.readAsText(file);
  };

  // ── Gestione tag (aggiungi / rinomina / colore / elimina) ───────────────────
  const addTagDef = (name: string) => {
    const n = name.trim();
    if (!n || tagDefs.some(t => t.name.toLowerCase() === n.toLowerCase())) return;
    setTagDefs(prev => [...prev, { name: n, color: TAG_PALETTE[prev.length % TAG_PALETTE.length] }]);
  };
  const renameTagDef = (oldName: string, newName: string) => {
    const n = newName.trim();
    if (!n || (n !== oldName && tagDefs.some(t => t.name.toLowerCase() === n.toLowerCase()))) return;
    setTagDefs(prev => prev.map(t => t.name === oldName ? { ...t, name: n } : t));
    setPeople(prev => {
      const next: Record<string, Person> = {};
      for (const [id, p] of Object.entries(prev))
        next[id] = p.tags?.includes(oldName) ? { ...p, tags: p.tags.map(t => t === oldName ? n : t) } : p;
      return next;
    });
  };
  const setTagDefColor = (name: string, color: string) =>
    setTagDefs(prev => prev.map(t => t.name === name ? { ...t, color } : t));
  const deleteTagDef = (name: string) => {
    setTagDefs(prev => prev.filter(t => t.name !== name));
    setPeople(prev => {
      const next: Record<string, Person> = {};
      for (const [id, p] of Object.entries(prev))
        next[id] = p.tags?.includes(name) ? { ...p, tags: p.tags.filter(t => t !== name) } : p;
      return next;
    });
  };

  // ── Shape draw mode ───────────────────────────────────────────────────────
  const [shapeMode, setShapeMode] = useState(false);
  const [activeShapeColor, setActiveShapeColor] = useState(SHAPE_PALETTE[0]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);
  const [shapeEditVal, setShapeEditVal] = useState("");
  type DrawPreview = { sx: number; sy: number; ex: number; ey: number };
  const drawPreviewRef = useRef<DrawPreview | null>(null);
  const [drawPreview, setDrawPreview] = useState<DrawPreview | null>(null);
  const shapeDragRef = useRef<{ id: string; mx: number; my: number; sx: number; sy: number } | null>(null);
  const shapeResizeRef = useRef<{ id: string; handle: string; mx: number; my: number; sx: number; sy: number; sw: number; sh: number } | null>(null);

  // Undo / redo + shape delete keyboard shortcuts
  const selectedShapeIdRef = useRef(selectedShapeId);
  selectedShapeIdRef.current = selectedShapeId;
  const selectedTableIdRef = useRef(selectedTableId);
  selectedTableIdRef.current = selectedTableId;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setShapeMode(false); setTableMenuOpen(false); setSelectedShapeId(null); setSelectedTableId(null); setEditingShapeId(null); setPageMenu(null); return; }
      if ((e.key === "Delete" || e.key === "Backspace") && !(e.target as HTMLElement).closest("input,textarea")) {
        if (selectedShapeIdRef.current) {
          setShapes(prev => prev.filter(s => s.id !== selectedShapeIdRef.current));
          setSelectedShapeId(null);
          return;
        }
        if (selectedTableIdRef.current) {
          pushHistory();
          setTables(prev => prev.filter(t => t.id !== selectedTableIdRef.current));
          setSelectedTableId(null);
          return;
        }
      }
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const prev = undoStack.current.pop();
        if (prev !== undefined) { redoStack.current.push(tablesRef.current); setTables(prev); }
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        const next = redoStack.current.pop();
        if (next !== undefined) { undoStack.current.push(tablesRef.current); setTables(next); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setTables, setShapes]);

  // ── Page CRUD ─────────────────────────────────────────────────────────────

  const switchPage = useCallback((pageId: string) => {
    setCurrentPageId(pageId);
    currentPageIdRef.current = pageId;
    undoStack.current = [];
    redoStack.current = [];
    setSelected(null);
    setDragInfo(null);
    setDragOverKey(null);
    setSelectedTableId(null);
    setSelectedShapeId(null);
  }, []);

  const addPage = useCallback(() => {
    const id = uid();
    const newPage: Page = { id, name: `Draft ${pages.length + 1}`, tables: makeFreshTables() };
    setPages(prev => [...prev, newPage]);
    switchPage(id);
  }, [pages.length, switchPage]);

  const deletePage = useCallback((pageId: string) => {
    if (pages.length <= 1) return;
    setPages(prev => {
      const next = prev.filter(p => p.id !== pageId);
      if (currentPageIdRef.current === pageId) switchPage(next[0].id);
      return next;
    });
  }, [pages.length, switchPage]);

  const renamePage = useCallback((pageId: string, name: string) => {
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, name } : p));
  }, []);

  const duplicatePage = useCallback((pageId: string) => {
    const id = uid();
    setPages(prev => {
      const src = prev.find(p => p.id === pageId);
      if (!src) return prev;
      const copy: Page = {
        id, name: `${src.name} (copia)`,
        tables: src.tables.map(t => ({ ...t, topSeats: [...t.topSeats], bottomSeats: [...t.bottomSeats] })),
        shapes: src.shapes ? src.shapes.map(s => ({ ...s, id: uid() })) : undefined,
      };
      const idx = prev.findIndex(p => p.id === pageId);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    switchPage(id);
  }, [switchPage]);

  // Sidebar
  const [pagesOpen, setPagesOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Larghezze regolabili (entro range min/max)
  const PAGES_MIN = 150, PAGES_MAX = 320;
  const GUESTS_MIN = 260, GUESTS_MAX = 520;
  const PAGES_LABEL = "Pages", GUESTS_LABEL = "Guest list";
  // Larghezza compatta (stato chiuso) — esplicita così la transizione anima
  const PAGES_CLOSED_W = 116, GUESTS_CLOSED_W = 226;
  const [pagesWidth, setPagesWidth] = useState(176);
  const [sidebarWidth, setSidebarWidth] = useState(368);
  const [isResizing, setIsResizing] = useState(false);
  // Menu contestuale pagine (tasto destro)
  const [pageMenu, setPageMenu] = useState<{ x: number; y: number; pageId: string } | null>(null);

  const startResize = useCallback((side: "pages" | "guests", e: RMouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = side === "pages" ? pagesWidth : sidebarWidth;
    const clamp = (w: number) => side === "pages"
      ? Math.min(PAGES_MAX, Math.max(PAGES_MIN, w))
      : Math.min(GUESTS_MAX, Math.max(GUESTS_MIN, w));
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const w = clamp(side === "pages" ? startW + dx : startW - dx);
      side === "pages" ? setPagesWidth(w) : setSidebarWidth(w);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setIsResizing(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    setIsResizing(true);
  }, [pagesWidth, sidebarWidth]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ListFilter>("all");

  // Pool drag counter
  const poolEnterCount = useRef(0);
  const [poolHighlight, setPoolHighlight] = useState(false);

  // Tracks whether the current drag ended on a valid drop target
  const dropHandled = useRef(false);

  // ── Canvas (zoom + pan + table drag) ──────────────────────────────────────
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.45);
  const [panX, setPanX] = useState(60);
  const [panY, setPanY] = useState(60);

  // Keep refs in sync for non-passive wheel handler
  const zoomRef = useRef(zoom);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  zoomRef.current = zoom;
  panXRef.current = panX;
  panYRef.current = panY;

  // Non-passive wheel listener for zoom
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey) {
        // Pinch-to-zoom (trackpad) or Ctrl+scroll (mouse)
        const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
        const curZoom = zoomRef.current;
        const newZoom = Math.min(Math.max(curZoom * factor, 0.08), 4);
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const cx = (mx - panXRef.current) / curZoom;
        const cy = (my - panYRef.current) / curZoom;
        setZoom(newZoom);
        setPanX(mx - cx * newZoom);
        setPanY(my - cy * newZoom);
      } else {
        // Two-finger scroll (trackpad) or mouse wheel → pan
        setPanX(px => px - e.deltaX);
        setPanY(py => py - e.deltaY);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Pan state
  const panStartRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  // Table drag state
  const tableDragRef = useRef<{ id: string; mx: number; my: number; tx: number; ty: number } | null>(null);
  const [isDraggingTable, setIsDraggingTable] = useState(false);

  const handleViewportMouseDown = useCallback((e: RMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[draggable="true"]')) return;
    if ((e.target as HTMLElement).closest('[data-shape]')) return;
    setSelectedShapeId(null);
    setSelectedTableId(null);
    if (shapeMode) {
      const c = toCanvas(e.clientX, e.clientY);
      drawPreviewRef.current = { sx: c.x, sy: c.y, ex: c.x, ey: c.y };
      setDrawPreview({ sx: c.x, sy: c.y, ex: c.x, ey: c.y });
      return;
    }
    panStartRef.current = { mx: e.clientX, my: e.clientY, px: panXRef.current, py: panYRef.current };
    setIsPanning(true);
  }, [shapeMode]);

  const handleStartTableDrag = useCallback((e: RMouseEvent<HTMLDivElement>, tableId: string, tx: number, ty: number) => {
    e.stopPropagation();
    setSelectedTableId(tableId);
    setSelectedShapeId(null);
    pushHistory();
    tableDragRef.current = { id: tableId, mx: e.clientX, my: e.clientY, tx, ty };
    setIsDraggingTable(true);
  }, [pushHistory]);

  const handleShapeMouseDown = useCallback((e: RMouseEvent<HTMLDivElement>, shape: Shape) => {
    e.stopPropagation();
    setSelectedTableId(null);
    setSelectedShapeId(shape.id);
    shapeDragRef.current = { id: shape.id, mx: e.clientX, my: e.clientY, sx: shape.x, sy: shape.y };
  }, []);

  const handleShapeResizeStart = useCallback((e: RMouseEvent<HTMLDivElement>, shape: Shape, handle: string) => {
    e.stopPropagation();
    pushHistory();
    setSelectedShapeId(shape.id);
    shapeResizeRef.current = { id: shape.id, handle, mx: e.clientX, my: e.clientY, sx: shape.x, sy: shape.y, sw: shape.w, sh: shape.h };
  }, [pushHistory]);

  const handleMouseMove = useCallback((e: RMouseEvent<HTMLDivElement>) => {
    if (shapeResizeRef.current) {
      const { id, handle, mx, my, sx, sy, sw, sh } = shapeResizeRef.current;
      const dx = (e.clientX - mx) / zoomRef.current;
      const dy = (e.clientY - my) / zoomRef.current;
      const MIN = 20;
      let nx = sx, ny = sy, nw = sw, nh = sh;
      if (handle.includes("e")) nw = Math.max(MIN, sw + dx);
      if (handle.includes("s")) nh = Math.max(MIN, sh + dy);
      if (handle.includes("w")) { nw = Math.max(MIN, sw - dx); nx = sx + (sw - nw); }
      if (handle.includes("n")) { nh = Math.max(MIN, sh - dy); ny = sy + (sh - nh); }
      setShapes(prev => prev.map(s => s.id === id ? { ...s, x: nx, y: ny, w: nw, h: nh } : s));
    } else if (tableDragRef.current) {
      const { id, mx, my, tx, ty } = tableDragRef.current;
      const dx = (e.clientX - mx) / zoomRef.current;
      const dy = (e.clientY - my) / zoomRef.current;
      setTables(prev => prev.map(t => t.id === id ? { ...t, x: tx + dx, y: ty + dy } : t));
    } else if (shapeDragRef.current) {
      const { id, mx, my, sx, sy } = shapeDragRef.current;
      const dx = (e.clientX - mx) / zoomRef.current;
      const dy = (e.clientY - my) / zoomRef.current;
      setShapes(prev => prev.map(s => s.id === id ? { ...s, x: sx + dx, y: sy + dy } : s));
    } else if (drawPreviewRef.current) {
      const c = toCanvas(e.clientX, e.clientY);
      const next = { ...drawPreviewRef.current, ex: c.x, ey: c.y };
      drawPreviewRef.current = next;
      setDrawPreview({ ...next });
    } else if (panStartRef.current) {
      setPanX(panStartRef.current.px + (e.clientX - panStartRef.current.mx));
      setPanY(panStartRef.current.py + (e.clientY - panStartRef.current.my));
    }
  }, []);

  const activeShapeColorRef = useRef(activeShapeColor);
  activeShapeColorRef.current = activeShapeColor;

  const handleMouseUp = useCallback(() => {
    if (drawPreviewRef.current) {
      const { sx, sy, ex, ey } = drawPreviewRef.current;
      const x = Math.min(sx, ex), y = Math.min(sy, ey);
      const w = Math.abs(ex - sx), h = Math.abs(ey - sy);
      if (w >= 20 && h >= 20) {
        const id = uid();
        setShapes(prev => [...prev, { id, x, y, w, h, label: "", color: activeShapeColorRef.current }]);
        // Dopo aver disegnato una zona si esce dalla modalità e la si seleziona.
        setShapeMode(false);
        setSelectedShapeId(id);
      }
      drawPreviewRef.current = null;
      setDrawPreview(null);
    }
    shapeDragRef.current = null;
    shapeResizeRef.current = null;
    tableDragRef.current = null;
    panStartRef.current = null;
    setIsPanning(false);
    setIsDraggingTable(false);
  }, [setShapes]);

  const fitView = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp || tables.length === 0) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const PAD = 80;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of tables) {
      const cols = Math.max(t.topSeats.length, t.bottomSeats.length);
      const w = cols * (SEAT_W + 8) + 80;
      const h = 260;
      minX = Math.min(minX, t.x); minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + w); maxY = Math.max(maxY, t.y + h);
    }
    const cw = maxX - minX || 1;
    const ch = maxY - minY || 1;
    const newZoom = Math.min(Math.max(Math.min((vw - PAD * 2) / cw, (vh - PAD * 2) / ch), 0.05), 2);
    setPanX((vw - cw * newZoom) / 2 - minX * newZoom);
    setPanY((vh - ch * newZoom) / 2 - minY * newZoom);
    setZoom(newZoom);
  }, [tables]);

  // Add person form
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [pName, setPName] = useState("");
  const [pColor, setPColor] = useState(COLORS[0]);

  // Edit person modal
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);

  // Add table form
  const [addTableOpen, setAddTableOpen] = useState(false);
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const [tName, setTName] = useState("Table 2");
  const [tTop, setTTop] = useState(8);
  const [tBot, setTBot] = useState(8);

  // ── Derived ────────────────────────────────────────────────────────────────

  const assignedSet = useMemo(() => {
    const set = new Set<string>();
    tables.forEach(t => {
      [...t.topSeats, ...t.bottomSeats].forEach(id => { if (id) set.add(id); });
    });
    return set;
  }, [tables]);

  const findPersonSeat = useCallback((personId: string): DragSrc | null => {
    for (const t of tables) {
      const ti = t.topSeats.indexOf(personId);
      if (ti !== -1) return { type: "seat", tableId: t.id, row: "top", idx: ti };
      const bi = t.bottomSeats.indexOf(personId);
      if (bi !== -1) return { type: "seat", tableId: t.id, row: "bottom", idx: bi };
    }
    return null;
  }, [tables]);

  const getPersonTableName = useCallback((personId: string): string | null => {
    for (const t of tables) {
      if (t.topSeats.includes(personId) || t.bottomSeats.includes(personId)) return t.name;
    }
    return null;
  }, [tables]);

  const filteredPeople = useMemo(() => {
    const q = normalizeStr(search);
    return Object.values(people).filter(p => {
      if (q && !normalizeStr(p.name).includes(q)) return false;
      if (filter === "free") return !assignedSet.has(p.id);
      if (filter === "assigned") return assignedSet.has(p.id);
      if (filter.startsWith("tag:")) return p.tags?.includes(filter.slice(4)) ?? false;
      return true;
    });
  }, [people, search, filter, assignedSet]);

  const totalAssigned = assignedSet.size;
  const totalPeople = Object.keys(people).length;

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(people).forEach(p => {
      p.tags?.forEach(tag => { counts[tag] = (counts[tag] ?? 0) + 1; });
    });
    return counts;
  }, [people]);

  // ── Move Logic ─────────────────────────────────────────────────────────────

  type DragTarget =
    | { type: "pool" }
    | { type: "seat"; tableId: string; row: "top" | "bottom"; idx: number }
    | { type: "gap";  tableId: string; row: "top" | "bottom"; afterIdx: number };

  const doMove = useCallback((personId: string, from: DragSrc, to: DragTarget) => {
    // ── To pool: free from seat ───────────────────────────────────────────────
    if (to.type === "pool") {
      if (from.type === "seat") {
        setTablesH(prev => prev.map(t => {
          if (t.id !== from.tableId) return t;
          const next = { ...t, topSeats: [...t.topSeats], bottomSeats: [...t.bottomSeats] };
          if (from.row === "top") next.topSeats[from.idx] = null;
          else next.bottomSeats[from.idx] = null;
          return next;
        }));
      }
      setSelected(null);
      return;
    }

    // ── To seat: SWAP if source is a seat, otherwise evict to pool ───────────
    if (to.type === "seat") {
      if (from.type === "seat" && from.tableId === to.tableId && from.row === to.row && from.idx === to.idx) return;
      setTablesH(prev => {
        const next = prev.map(t => ({ ...t, topSeats: [...t.topSeats], bottomSeats: [...t.bottomSeats] }));
        const dt = next.find(t => t.id === to.tableId)!;
        const evicted = (to.row === "top" ? dt.topSeats : dt.bottomSeats)[to.idx] ?? null;
        if (to.row === "top") dt.topSeats[to.idx] = personId;
        else dt.bottomSeats[to.idx] = personId;
        if (from.type === "seat") {
          const st = next.find(t => t.id === from.tableId)!;
          if (from.row === "top") st.topSeats[from.idx] = evicted;
          else st.bottomSeats[from.idx] = evicted;
        }
        return next;
      });
      setSelected(null);
      return;
    }

    // ── To gap: INSERT + SHIFT; se la riga è piena aggiunge uno slot ──────────
    if (to.type === "gap") {
      setTablesH(prev => {
        const next = prev.map(t => ({ ...t, topSeats: [...t.topSeats], bottomSeats: [...t.bottomSeats] }));

        if (from.type === "seat" && from.tableId === to.tableId && from.row === to.row) {
          // Stessa riga: rimuovi e reinserisci (lunghezza invariata)
          const dt = next.find(t => t.id === to.tableId)!;
          const arr = to.row === "top" ? dt.topSeats : dt.bottomSeats;
          arr.splice(from.idx, 1);
          const insertAt = from.idx < to.afterIdx ? to.afterIdx - 1 : to.afterIdx;
          arr.splice(insertAt, 0, personId);
        } else {
          // Riga/tavolo diverso: azzera sorgente, inserisci nella destinazione
          if (from.type === "seat") {
            const st = next.find(t => t.id === from.tableId)!;
            if (from.row === "top") st.topSeats[from.idx] = null;
            else st.bottomSeats[from.idx] = null;
          }
          const dt = next.find(t => t.id === to.tableId)!;
          const dstArr = to.row === "top" ? dt.topSeats : dt.bottomSeats;
          const rowFull = !dstArr.includes(null);
          dstArr.splice(to.afterIdx, 0, personId); // lunghezza +1
          if (!rowFull) dstArr.pop();               // se c'era un null, rimuovi l'ultimo (era null)
          // se piena: la riga cresce di uno slot
        }

        return next;
      });
      setSelected(null);
      return;
    }
  }, [setTablesH]);

  // ── Drag Handlers ──────────────────────────────────────────────────────────

  const onPersonDragStart = useCallback((e: DragEvent<HTMLDivElement>, personId: string, src: DragSrc) => {
    dropHandled.current = false;
    setDragInfo({ personId, src });
    setSelected(null);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const onPersonDragEnd = useCallback(() => {
    if (!dropHandled.current && dragInfo?.src.type === "seat") {
      const { tableId, row, idx } = dragInfo.src;
      setTablesH(prev => prev.map(t => {
        if (t.id !== tableId) return t;
        const next = { ...t, topSeats: [...t.topSeats], bottomSeats: [...t.bottomSeats] };
        if (row === "top") next.topSeats[idx] = null;
        else next.bottomSeats[idx] = null;
        return next;
      }));
    }
    dropHandled.current = false;
    setDragInfo(null);
    setDragOverKey(null);
    poolEnterCount.current = 0;
    setPoolHighlight(false);
  }, [dragInfo, setTablesH]);

  const onSeatDragOver = useCallback((e: DragEvent<HTMLDivElement>, key: string) => {
    e.preventDefault();
    e.stopPropagation(); // evita che il canvas azzeri l'evidenziazione mentre siamo sul posto
    e.dataTransfer.dropEffect = "move";
    setDragOverKey(key);
  }, []);

  const onSeatDrop = useCallback((e: DragEvent<HTMLDivElement>, tableId: string, row: "top" | "bottom", idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    dropHandled.current = true;
    if (dragInfo) doMove(dragInfo.personId, dragInfo.src, { type: "seat", tableId, row, idx });
    setDragInfo(null);
    setDragOverKey(null);
  }, [dragInfo, doMove]);

  // Area interna del tavolo (disco/spazi, non una sedia): zona "sicura".
  // Passandovi sopra non è una rimozione; rilasciando la persona resta dov'è.
  const onTableAreaDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverKey("__inside__");
  }, []);
  const onTableAreaDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dropHandled.current = true; // niente rimozione: resta dov'è
    setDragInfo(null);
    setDragOverKey(null);
  }, []);

  const onGapDragOver = useCallback((e: DragEvent<HTMLDivElement>, key: string) => {
    e.preventDefault();
    e.stopPropagation(); // prevent seat dragover from stealing the key
    e.dataTransfer.dropEffect = "move";
    setDragOverKey(key);
  }, []);

  const onGapDrop = useCallback((e: DragEvent<HTMLDivElement>, tableId: string, row: "top" | "bottom", afterIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    dropHandled.current = true;
    if (dragInfo) doMove(dragInfo.personId, dragInfo.src, { type: "gap", tableId, row, afterIdx });
    setDragInfo(null);
    setDragOverKey(null);
  }, [dragInfo, doMove]);

  const onGapClick = useCallback((tableId: string, row: "top" | "bottom", afterIdx: number) => {
    if (!selected) return;
    doMove(selected.personId, selected.src, { type: "gap", tableId, row, afterIdx });
  }, [selected, doMove]);

  // ── Click-to-Move ──────────────────────────────────────────────────────────

  const onSeatClick = useCallback((tableId: string, row: "top" | "bottom", idx: number) => {
    // no-op: person click is handled by onPersonClick; empty seat click does nothing
  }, []);

  const onListPersonClick = useCallback((personId: string) => {
    setEditingPersonId(personId);
  }, []);

  const onListDragStart = useCallback((e: DragEvent<HTMLDivElement>, personId: string) => {
    const seat = findPersonSeat(personId);
    onPersonDragStart(e, personId, seat ?? { type: "pool" });
  }, [findPersonSeat, onPersonDragStart]);

  const onPoolAreaClick = useCallback(() => {
    if (selected) doMove(selected.personId, selected.src, { type: "pool" });
  }, [selected, doMove]);

  // ── Seat Count ─────────────────────────────────────────────────────────────

  const removeSlot = useCallback((tableId: string, row: "top" | "bottom", idx: number) => {
    setTablesH(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      const arr = row === "top" ? [...t.topSeats] : [...t.bottomSeats];
      if (arr.length <= 1) return t;
      arr.splice(idx, 1);
      return row === "top" ? { ...t, topSeats: arr } : { ...t, bottomSeats: arr };
    }));
  }, [setTablesH]);

  const adjustSeats = useCallback((tableId: string, row: "top" | "bottom", delta: number) => {
    setTablesH(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      const arr = row === "top" ? t.topSeats : t.bottomSeats;
      if (delta > 0) {
        const newArr = [...arr, null];
        return row === "top" ? { ...t, topSeats: newArr } : { ...t, bottomSeats: newArr };
      } else {
        if (arr.length <= 1) return t;
        const newArr = arr.slice(0, -1);
        return row === "top" ? { ...t, topSeats: newArr } : { ...t, bottomSeats: newArr };
      }
    }));
  }, [setTablesH]);

  // ── Table Management ───────────────────────────────────────────────────────

  // Crea un tavolo del tipo scelto al centro della vista, e lo seleziona.
  const createTable = (shape: TableShape) => {
    const vp = viewportRef.current;
    const vw = vp?.clientWidth ?? 800;
    const vh = vp?.clientHeight ?? 600;
    const cx = (vw / 2 - panX) / zoom;
    const cy = (vh / 2 - panY) / zoom;
    const id = uid();
    setTablesH(prev => [...prev, {
      id,
      name: `Table ${prev.length + 1}`,
      topSeats: Array(8).fill(null),
      bottomSeats: shape === "round" ? [] : Array(8).fill(null),
      x: Math.round(cx - 200),
      y: Math.round(cy - 120),
      shape,
    }]);
    setSelectedShapeId(null);
    setSelectedTableId(id);
  };

  const addTable = () => {
    if (!tName.trim()) return;
    const vp = viewportRef.current;
    const vw = vp?.clientWidth ?? 800;
    const vh = vp?.clientHeight ?? 600;
    const cx = (vw / 2 - panX) / zoom;
    const cy = (vh / 2 - panY) / zoom;
    setTablesH(prev => [...prev, {
      id: uid(), name: tName.trim(),
      topSeats: Array(tTop).fill(null),
      bottomSeats: Array(tBot).fill(null),
      x: Math.round(cx - 300),
      y: Math.round(cy - 100),
    }]);
    setTName(`Table ${tables.length + 2}`);
    setAddTableOpen(false);
  };

  const deleteTable = (tableId: string) => {
    setTablesH(prev => prev.filter(t => t.id !== tableId));
  };

  const renameTable = (tableId: string, name: string) => {
    setTablesH(prev => prev.map(t => t.id === tableId ? { ...t, name } : t));
  };

  const flipTable = (tableId: string) => {
    setTablesH(prev => prev.map(t =>
      t.id === tableId ? { ...t, topSeats: t.bottomSeats, bottomSeats: t.topSeats } : t
    ));
  };

  const flipTableH = (tableId: string) => {
    setTablesH(prev => prev.map(t =>
      t.id === tableId ? { ...t, topSeats: [...t.topSeats].reverse(), bottomSeats: [...t.bottomSeats].reverse() } : t
    ));
  };

  // ── Shape management ────────────────────────────────────────────────────────

  const addShape = (x: number, y: number, w: number, h: number) => {
    if (w < 20 || h < 20) return;
    setShapes(prev => [...prev, { id: uid(), x, y, w, h, label: "", color: activeShapeColor }]);
  };

  const deleteShape = (id: string) => {
    setShapes(prev => prev.filter(s => s.id !== id));
    if (selectedShapeId === id) setSelectedShapeId(null);
  };

  const updateShape = (id: string, patch: Partial<Shape>) => {
    setShapes(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const toCanvas = (clientX: number, clientY: number) => {
    const rect = viewportRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left - panXRef.current) / zoomRef.current,
      y: (clientY - rect.top - panYRef.current) / zoomRef.current,
    };
  };

  // ── Person Management ──────────────────────────────────────────────────────

  const addPerson = () => {
    if (!pName.trim()) return;
    const id = uid();
    setPeople(prev => ({ ...prev, [id]: { id, name: pName.trim(), color: pColor } }));
    setPName("");
    setPColor(COLORS[0]);
    setAddPersonOpen(false);
  };

  const deletePerson = (personId: string) => {
    setTablesH(prev => prev.map(t => ({
      ...t,
      topSeats: t.topSeats.map(id => id === personId ? null : id),
      bottomSeats: t.bottomSeats.map(id => id === personId ? null : id),
    })));
    setPeople(prev => { const n = { ...prev }; delete n[personId]; return n; });
    if (selected?.personId === personId) setSelected(null);
  };

  const updatePerson = useCallback((personId: string, name: string, color: string, tags: string[]) => {
    setPeople(prev => ({ ...prev, [personId]: { ...prev[personId], name, color, tags } }));
    setEditingPersonId(null);
  }, []);

  const openPersonEdit = useCallback((personId: string) => {
    setEditingPersonId(personId);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  // Adaptive grid: keep dot spacing ≥ 20px on screen regardless of zoom
  const gridStep = (() => { let g = 22; while (g * zoom < 20) g *= 2; return g * zoom; })();

  const isDragging = !!dragInfo;
  const hasSelected = !!selected;
  const isDraggingFromSeat = isDragging && dragInfo?.src.type === "seat";
  const willFreeOnRelease  = isDraggingFromSeat && dragOverKey === null;

  return (
    <div className="h-screen flex flex-col bg-gray-50 font-[Inter,sans-serif] overflow-hidden">
      <GlobalTooltip />

      {/* Body (nessun header: la barra strumenti è flottante in basso).
          Sidebar come pannelli floating sopra il canvas a tutta larghezza. */}
      <div className="relative flex-1 overflow-hidden">

        {/* Pages sidebar (left) — UN SOLO elemento: pillola compatta da chiuso,
            si espande a pannello pieno da aperto */}
        <aside
          className={[
            "absolute top-1.5 left-1.5 z-30 bg-white flex flex-col overflow-hidden border border-gray-200 shadow-lg rounded-2xl",
            pagesOpen ? "bottom-1.5" : "",
          ].join(" ")}
          style={{ width: pagesOpen ? pagesWidth : PAGES_CLOSED_W, transition: isResizing ? "none" : "width 0.18s ease" }}
        >
          <div className={["flex items-center shrink-0 gap-2 justify-between px-3.5 py-3", pagesOpen ? "border-b border-gray-100" : ""].join(" ")}>
            <SidebarToggle label={PAGES_LABEL} side="left" open={pagesOpen} onToggle={() => setPagesOpen(v => !v)} variant="header" />
            {pagesOpen && (
              <button onClick={addPage} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors shrink-0" title="New page">
                <Plus size={14} />
              </button>
            )}
          </div>
          {pagesOpen && (
            <div className="flex-1 overflow-y-auto py-1">
              {pages.map(page => (
                <PageItem
                  key={page.id} page={page}
                  isActive={page.id === currentPageId}
                  onSwitch={() => switchPage(page.id)}
                  onRename={name => renamePage(page.id, name)}
                  onContextMenu={(x, y) => setPageMenu({ x, y, pageId: page.id })}
                />
              ))}
            </div>
          )}
          {/* Maniglia di ridimensionamento (bordo destro) */}
          {pagesOpen && (
            <div onMouseDown={e => startResize("pages", e)}
              className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400/40 transition-colors"
              title="Drag to resize" />
          )}
        </aside>

        {/* Canvas viewport (a tutta area; le sidebar floating vi stanno sopra) */}
        <div
          ref={viewportRef}
          className="absolute inset-0 overflow-hidden select-none"
          style={{
            background: "#eceef1",
            backgroundImage: "radial-gradient(circle, #c4c8ce 1px, transparent 1px)",
            backgroundSize: `${gridStep}px ${gridStep}px`,
            backgroundPosition: `${panX % gridStep}px ${panY % gridStep}px`,
            cursor: isDraggingTable ? "grabbing" : isPanning ? "grabbing" : shapeMode ? "crosshair" : "default",
          }}
          onMouseDown={handleViewportMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDragOver={e => { e.preventDefault(); setDragOverKey(null); }}
        >
          {/* Transform layer */}
          <div style={{ position: "absolute", transform: `translate(${panX}px,${panY}px) scale(${zoom})`, transformOrigin: "0 0", willChange: "transform" }}>

            {/* Shapes */}
            {shapes.map(shape => {
              const isSelected = selectedShapeId === shape.id;
              return (
                <div key={shape.id} data-shape="1"
                  style={{
                    position: "absolute", left: shape.x, top: shape.y, width: shape.w, height: shape.h,
                    backgroundColor: shape.color + "28",
                    border: `2px ${isSelected ? "solid" : "dashed"} ${shape.color}`,
                    borderRadius: 10,
                    cursor: isSelected ? "move" : "pointer",
                    zIndex: 0,
                    pointerEvents: "auto",
                  }}
                  onClick={e => { e.stopPropagation(); setSelectedTableId(null); setSelectedShapeId(shape.id); }}
                  onMouseDown={e => handleShapeMouseDown(e, shape)}
                >
                  {/* Label */}
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <InlineEditText
                      value={shape.label}
                      onCommit={v => updateShape(shape.id, { label: v })}
                      textStyle={{ fontSize: shape.fontSize ?? 14, fontWeight: 700, color: shape.color }}
                      placeholder="click to add a name"
                      center
                      wrap
                      maxWidth={Math.max(40, shape.w - 24)}
                    />
                  </div>

                </div>
              );
            })}

            {/* Draw preview */}
            {drawPreview && (() => {
              const x = Math.min(drawPreview.sx, drawPreview.ex);
              const y = Math.min(drawPreview.sy, drawPreview.ey);
              const w = Math.abs(drawPreview.ex - drawPreview.sx);
              const h = Math.abs(drawPreview.ey - drawPreview.sy);
              return (
                <div style={{ position: "absolute", left: x, top: y, width: w, height: h, backgroundColor: activeShapeColor + "1a", border: `2px dashed ${activeShapeColor}`, borderRadius: 10, pointerEvents: "none", zIndex: 20 }} />
              );
            })()}

            {tables.map(table => (
              <TableCard
                key={table.id} table={table} people={people}
                draggingId={dragInfo?.personId ?? null}
                dragOverKey={dragOverKey} selected={selected}
                onSeatDragOver={onSeatDragOver} onSeatDrop={onSeatDrop}
                onPersonDragStart={onPersonDragStart} onPersonDragEnd={onPersonDragEnd}
                onSeatClick={onSeatClick}
                onPersonClick={openPersonEdit}
                onGapDragOver={onGapDragOver} onGapDrop={onGapDrop} onGapClick={onGapClick}
                onAdjust={adjustSeats}
                onRemoveSlot={removeSlot}
                onDelete={() => deleteTable(table.id)}
                onRename={name => renameTable(table.id, name)}
                onFlip={() => flipTable(table.id)}
                onFlipH={() => flipTableH(table.id)}
                onStartTableDrag={e => handleStartTableDrag(e, table.id, table.x, table.y)}
                zoom={zoom}
                isSelected={selectedTableId === table.id}
                onSelect={() => { setSelectedTableId(table.id); setSelectedShapeId(null); }}
                willFreeOnRelease={willFreeOnRelease}
                onTableAreaDragOver={onTableAreaDragOver}
                onTableAreaDrop={onTableAreaDrop}
                tagColor={tagColor}
              />
            ))}

            {/* Chrome tavoli (titoli + toolbar) — layer SOPRA tutti i frame,
                così i titoli non vengono mai coperti dai tavoli vicini */}
            <div style={{ position: "absolute", left: 0, top: 0, zIndex: 40, pointerEvents: "none" }}>
              {tables.map(table => (
                <TableChrome
                  key={table.id}
                  table={table}
                  occupied={[...table.topSeats, ...table.bottomSeats].filter(Boolean).length}
                  total={table.topSeats.length + table.bottomSeats.length}
                  zoom={zoom}
                  isSelected={selectedTableId === table.id}
                  onSelect={() => { setSelectedTableId(table.id); setSelectedShapeId(null); }}
                  onStartTableDrag={e => handleStartTableDrag(e, table.id, table.x, table.y)}
                  onRename={name => renameTable(table.id, name)}
                  onAdjust={adjustSeats}
                  onFlip={() => flipTable(table.id)}
                  onFlipH={() => flipTableH(table.id)}
                  onDelete={() => deleteTable(table.id)}
                />
              ))}
            </div>
          </div>

          {/* Selezione zona (screen-space): frame blu + maniglie + pill colori */}
          {selectedShapeId && !editingShapeId && (() => {
            const shape = shapes.find(s => s.id === selectedShapeId);
            if (!shape) return null;
            const BLUE = "#3b82f6";
            const left = panX + shape.x * zoom;
            const top = panY + shape.y * zoom;
            const w = shape.w * zoom;
            const h = shape.h * zoom;
            const CS = 12, DS = 11;
            const handles = [
              { key: "nw", cx: 0, cy: 0, cursor: "nwse-resize", corner: true },
              { key: "ne", cx: w, cy: 0, cursor: "nesw-resize", corner: true },
              { key: "sw", cx: 0, cy: h, cursor: "nesw-resize", corner: true },
              { key: "se", cx: w, cy: h, cursor: "nwse-resize", corner: true },
              { key: "n", cx: w / 2, cy: 0, cursor: "ns-resize", corner: false },
              { key: "s", cx: w / 2, cy: h, cursor: "ns-resize", corner: false },
              { key: "w", cx: 0, cy: h / 2, cursor: "ew-resize", corner: false },
              { key: "e", cx: w, cy: h / 2, cursor: "ew-resize", corner: false },
            ];
            return (
              <div style={{ position: "absolute", left, top, width: w, height: h, zIndex: 30, pointerEvents: "none" }}>
                {/* Frame blu */}
                <div style={{ position: "absolute", inset: 0, border: `2px solid ${BLUE}`, borderRadius: 2, boxSizing: "border-box" }} />

                {/* Pill colori (sopra la zona) */}
                <div style={{ position: "absolute", left: "50%", top: -14, transform: "translate(-50%,-100%)", display: "flex", alignItems: "center", gap: 7, background: "white", borderRadius: 14, padding: "7px 12px", boxShadow: "0 6px 20px rgba(0,0,0,0.16)", border: "1px solid #e5e7eb", pointerEvents: "auto", whiteSpace: "nowrap" }}
                  onMouseDown={e => e.stopPropagation()}>
                  {SHAPE_PALETTE.map(c => (
                    <button key={c} onClick={e => { e.stopPropagation(); updateShape(shape.id, { color: c }); setActiveShapeColor(c); }}
                      title="Change color"
                      style={{ width: 22, height: 22, borderRadius: "50%", background: c, border: shape.color === c ? "2px solid #111" : "2px solid #fff", boxShadow: shape.color === c ? "0 0 0 1.5px #111" : "0 0 0 1px #e5e7eb", cursor: "pointer", flexShrink: 0, padding: 0 }} />
                  ))}
                  <div style={{ width: 1, height: 24, background: "#e5e7eb", margin: "0 2px" }} />
                  {/* Dimensione testo — select con 4 taglie definite */}
                  <select value={ZONE_TEXT_SIZES.some(s => s.value === (shape.fontSize ?? 14)) ? (shape.fontSize ?? 14) : 14}
                    onChange={e => { e.stopPropagation(); updateShape(shape.id, { fontSize: Number(e.target.value) }); }}
                    onMouseDown={e => e.stopPropagation()} title="Text size"
                    style={{ height: 32, borderRadius: 9, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: 14, fontWeight: 600, padding: "0 8px", cursor: "pointer" }}>
                    {ZONE_TEXT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <div style={{ width: 1, height: 24, background: "#e5e7eb", margin: "0 2px" }} />
                  <button onClick={e => { e.stopPropagation(); deleteShape(shape.id); }} title="Delete zone"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>
                    <Trash2 size={19} />
                  </button>
                </div>

                {/* Maniglie di ridimensionamento */}
                {handles.map(hd => (
                  <div key={hd.key} onMouseDown={e => handleShapeResizeStart(e, shape, hd.key)}
                    style={{
                      position: "absolute", left: hd.cx, top: hd.cy, transform: "translate(-50%,-50%)",
                      width: hd.corner ? CS : DS, height: hd.corner ? CS : DS,
                      borderRadius: hd.corner ? 3 : "50%",
                      background: hd.corner ? "#fff" : BLUE,
                      border: hd.corner ? `2px solid ${BLUE}` : "2px solid #fff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                      cursor: hd.cursor, pointerEvents: "auto", boxSizing: "border-box",
                    }} />
                ))}
              </div>
            );
          })()}

          {/* Empty state */}
          {tables.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none select-none">
              <p className="font-semibold">No tables</p>
              <p className="text-sm mt-1">Click "+ Table" to add one</p>
            </div>
          )}


        </div>
        {/* — Fine canvas viewport — Chrome flottante (toggle + bottom bar) sopra i pannelli */}

        {/* Bottom bar (stile Figma, icone-only): logo · azioni · zoom · stato */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-1 bg-white rounded-2xl shadow-xl border border-gray-200 px-2.5 h-16">
              {/* Add table — menu tipo (rettangolare / rotondo) */}
              <div className="relative">
                <button onClick={() => { setShapeMode(false); setTableMenuOpen(v => !v); }} title="Add table"
                  className={["w-12 h-12 flex items-center justify-center rounded-xl transition-colors",
                    tableMenuOpen ? "bg-blue-100 text-blue-700" : "text-blue-600 hover:bg-blue-50"].join(" ")}>
                  <SquarePlus size={24} />
                </button>
                {tableMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setTableMenuOpen(false)} />
                    <div className="absolute bottom-full mb-2 left-0 z-50 bg-white rounded-xl shadow-lg border border-gray-200 py-1 min-w-[190px]">
                      <button onClick={() => { createTable("rect"); setTableMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                        <RectangleHorizontal size={16} className="text-blue-500" /> Rectangular table
                      </button>
                      <button onClick={() => { createTable("round"); setTableMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                        <Circle size={16} className="text-blue-500" /> Round table
                      </button>
                    </div>
                  </>
                )}
              </div>
              {/* Add person */}
              <button onClick={() => { setShapeMode(false); setAddPersonOpen(true); }} title="Add person"
                className="w-12 h-12 flex items-center justify-center rounded-xl text-violet-600 hover:bg-violet-50 transition-colors">
                <UserPlus size={24} />
              </button>
              {/* Zone (disegno forme) */}
              <div className="relative">
                <button onClick={() => { setShapeMode(v => !v); setSelectedShapeId(null); setEditingShapeId(null); }} title="Draw zones"
                  className={["w-12 h-12 flex items-center justify-center rounded-xl transition-colors",
                    shapeMode ? "bg-amber-500 text-white" : "text-amber-600 hover:bg-amber-50",
                  ].join(" ")}>
                  <VectorSquare size={23} />
                </button>
                {shapeMode && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl shadow-lg px-2.5 py-2">
                    {SHAPE_PALETTE.map(c => (
                      <button key={c} onClick={() => setActiveShapeColor(c)} title="Zone color"
                        style={{ backgroundColor: c, width: 18, height: 18, borderRadius: "50%", border: activeShapeColor === c ? "2px solid #111" : "2px solid transparent", flexShrink: 0 }} />
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px h-7 bg-gray-200 mx-1.5" />

              {/* Zoom */}
              <button onClick={() => { const nz = Math.max(zoom / 1.3, 0.08); const vp = viewportRef.current; if (!vp) return; const cx = vp.clientWidth/2; const cy = vp.clientHeight/2; const cxc = (cx - panX) / zoom; const cyc = (cy - panY) / zoom; setPanX(cx - cxc*nz); setPanY(cy - cyc*nz); setZoom(nz); }}
                className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors" title="Zoom out">
                <ZoomOut size={21} />
              </button>
              <button onClick={() => { setZoom(1); setPanX(60); setPanY(60); }}
                className="px-1.5 text-sm font-mono font-semibold text-gray-600 hover:text-gray-900 min-w-[3.25rem] text-center transition-colors" title="Reset zoom">
                {Math.round(zoom * 100)}%
              </button>
              <button onClick={() => { const nz = Math.min(zoom * 1.3, 4); const vp = viewportRef.current; if (!vp) return; const cx = vp.clientWidth/2; const cy = vp.clientHeight/2; const cxc = (cx - panX) / zoom; const cyc = (cy - panY) / zoom; setPanX(cx - cxc*nz); setPanY(cy - cyc*nz); setZoom(nz); }}
                className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors" title="Zoom in">
                <ZoomIn size={21} />
              </button>
              <button onClick={fitView}
                className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors" title="Fit to screen">
                <Maximize2 size={20} />
              </button>

              <div className="w-px h-7 bg-gray-200 mx-1.5" />

              {/* Import / Export JSON */}
              <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) importData(f); e.target.value = ""; }} />
              <button onClick={() => fileInputRef.current?.click()} title="Import (JSON)"
                className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
                <Upload size={21} />
              </button>
              <button onClick={exportData} title="Export (JSON)"
                className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
                <Download size={21} />
              </button>

              <div className="w-px h-7 bg-gray-200 mx-1.5" />

              {/* Stato salvataggio (cloud) */}
              <div className="w-12 h-12 flex items-center justify-center"
                title={
                  saveStatus === "saving" ? "Saving…" :
                  saveStatus === "error"  ? "Save error" : "Saved"
                }>
                {saveStatus === "error"
                  ? <CloudOff size={23} className="text-red-500" />
                  : <Cloud size={23} className={
                      saveStatus === "saving" ? "text-gray-400 animate-pulse" : "text-green-500"
                    } />}
              </div>
            </div>
          </div>

        {/* Sidebar — guest list — UN SOLO elemento: pillola compatta da chiuso,
            si espande a pannello pieno da aperto */}
        <aside
          className={[
            "absolute top-1.5 right-1.5 z-30 bg-white flex flex-col overflow-hidden border border-gray-200 shadow-lg rounded-2xl",
            sidebarOpen ? "bottom-1.5" : "",
            poolHighlight && isDragging ? "bg-amber-50 border-amber-300" : "",
          ].join(" ")}
          style={{ width: sidebarOpen ? sidebarWidth : GUESTS_CLOSED_W, transition: isResizing ? "none" : "width 0.18s ease" }}
          onDragEnter={() => { poolEnterCount.current++; setPoolHighlight(true); setDragOverKey("pool"); }}
          onDragLeave={() => {
            poolEnterCount.current--;
            if (poolEnterCount.current <= 0) { poolEnterCount.current = 0; setPoolHighlight(false); setDragOverKey(null); }
          }}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
          onDrop={e => {
            e.preventDefault();
            dropHandled.current = true;
            if (dragInfo) doMove(dragInfo.personId, dragInfo.src, { type: "pool" });
            poolEnterCount.current = 0; setPoolHighlight(false);
          }}
          onClick={onPoolAreaClick}
        >
          {/* Sidebar header */}
          <div className={["shrink-0 px-3.5 py-3", sidebarOpen ? "space-y-2 border-b border-gray-100" : ""].join(" ")}>
            <div className="flex items-center justify-between gap-2">
              <SidebarToggle label={GUESTS_LABEL} side="right" open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} variant="header" />
              <span className="text-xs font-bold bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 whitespace-nowrap shrink-0">
                {totalAssigned}/{totalPeople}
              </span>
            </div>

            {/* Search */}
            {sidebarOpen && <div className="relative" onClick={e => e.stopPropagation()}>
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search guest..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white"
              />
              {search && (
                <button onClick={() => setSearch("")} title="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={12} />
                </button>
              )}
            </div>}

            {/* Filter tabs */}
            {sidebarOpen && <div className="flex gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
              {([
                { f: "all",      label: "All",        icon: Users,         count: totalPeople },
                { f: "free",     label: "Unassigned", icon: CircleDashed,  count: totalPeople - totalAssigned },
                { f: "assigned", label: "Assigned",    icon: UserCheck,     count: totalAssigned },
              ] as const).map(({ f, label, icon: Icon, count }) => {
                const isActive = filter === f;
                return (
                  <button key={f} onClick={() => setFilter(f)} title={`Show ${label.toLowerCase()} guests`}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
                    style={isActive
                      ? { backgroundColor: "#1f2937", color: "#fff" }
                      : { backgroundColor: "#1f293714", color: "#6b7280" }}>
                    <Icon size={12} />
                    <span>{label}</span>
                    <span className={isActive ? "opacity-70" : "opacity-50"}>{count}</span>
                  </button>
                );
              })}
            </div>}

            {/* Tag filters (dynamic) + manage */}
            {sidebarOpen && (
              <div className="flex gap-1.5 flex-wrap items-center" onClick={e => e.stopPropagation()}>
                {tagDefs.map(({ name, color }) => {
                  const count = tagCounts[name] ?? 0;
                  const isActive = filter === `tag:${name}`;
                  return (
                    <button key={name}
                      onClick={() => setFilter(isActive ? "all" : `tag:${name}`)}
                      title={isActive ? "Clear tag filter" : `Filter by "${name}"`}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
                      style={isActive ? { backgroundColor: color, color: "#fff" } : { backgroundColor: color + "22", color }}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isActive ? "#fff" : color }} />
                      <span>{name}</span>
                      <span className={isActive ? "opacity-80" : "opacity-60"}>{count}</span>
                    </button>
                  );
                })}
                <button onClick={() => setTagsModalOpen(true)} title="Manage tags"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                  <TagsIcon size={13} /> Manage
                </button>
              </div>
            )}
          </div>

          {/* Person list */}
          {sidebarOpen && <div className="flex-1 overflow-y-auto">
            {filteredPeople.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4 select-none">
                <Users size={24} className="mb-2 text-gray-300" />
                {Object.keys(people).length === 0 ? (
                  <>
                    <p className="text-xs text-gray-400 mb-3">Your guest list is empty.</p>
                    <button onClick={() => setAddPersonOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors shadow-sm">
                      <UserPlus size={14} /> Add your first guest
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-gray-300">{search ? "No matches" : "No guests"}</p>
                )}
              </div>
            ) : (
              <div className="py-1">
                {filteredPeople.map(person => {
                  const isAssigned = assignedSet.has(person.id);
                  const tableName = isAssigned ? getPersonTableName(person.id) : null;
                  const isDraggingThis = dragInfo?.personId === person.id;

                  return (
                    <div
                      key={person.id}
                      draggable
                      onDragStart={e => { e.stopPropagation(); onListDragStart(e, person.id); }}
                      onDragEnd={onPersonDragEnd}
                      onClick={e => { e.stopPropagation(); onListPersonClick(person.id); }}
                      title={`${person.name} — click to edit, drag onto a seat`}
                      className={[
                        "flex items-center gap-2.5 px-3 py-2 cursor-grab active:cursor-grabbing",
                        "transition-all duration-75 select-none group border-b border-gray-50 last:border-0",
                        isDraggingThis ? "opacity-30" : "opacity-100",
                        isAssigned ? "bg-gray-50/70 hover:bg-gray-100/70" : "hover:bg-gray-50",
                      ].filter(Boolean).join(" ")}
                    >
                      {/* Color dot */}
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: person.color }}
                      />

                      {/* Name + tag dots */}
                      <div className="flex-1 min-w-0">
                        <span className={[
                          "text-xs truncate font-medium block",
                          isAssigned ? "text-gray-400" : "text-gray-800",
                        ].filter(Boolean).join(" ")}>
                          {person.name}
                        </span>
                        {person.tags && person.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {person.tags.map(tag => (
                              <span key={tag} className="w-2 h-2 rounded-full" style={{ backgroundColor: tagColor(tag) }} title={tag} />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Table badge or delete */}
                      {isAssigned && tableName ? (
                        <span className="text-[9px] font-semibold bg-gray-200 text-gray-500 rounded px-1.5 py-0.5 shrink-0">
                          {tableName}
                        </span>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); deletePerson(person.id); }}
                          title="Delete guest"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 shrink-0"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>}

          {/* Drop hint when dragging from seat */}
          {sidebarOpen && isDragging && dragInfo?.src.type === "seat" && (
            <div className={[
              "px-4 py-3 border-t border-gray-100 text-center text-xs font-medium transition-colors shrink-0",
              poolHighlight ? "text-amber-600 bg-amber-50" : "text-gray-400",
            ].join(" ")}>
              {poolHighlight ? "↓ Rilascia per liberare il posto" : "Drag here to free the seat"}
            </div>
          )}
          {/* Maniglia di ridimensionamento (bordo sinistro) */}
          {sidebarOpen && (
            <div onMouseDown={e => { e.stopPropagation(); startResize("guests", e); }}
              className="absolute top-0 left-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400/40 transition-colors z-10"
              title="Drag to resize" />
          )}
        </aside>
      </div>

      {/* Menu contestuale pagine (tasto destro) */}
      {pageMenu && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setPageMenu(null)} onContextMenu={e => { e.preventDefault(); setPageMenu(null); }} />
          <div className="fixed z-[61] bg-white rounded-xl shadow-xl border border-gray-200 py-1 min-w-[168px] text-sm"
            style={{ left: Math.min(pageMenu.x, window.innerWidth - 180), top: Math.min(pageMenu.y, window.innerHeight - 100) }}>
            <button onClick={() => { duplicatePage(pageMenu.pageId); setPageMenu(null); }}
              className="w-full text-left px-3 py-1.5 flex items-center gap-2.5 hover:bg-gray-100 text-gray-700 transition-colors">
              <Copy size={13} /> Duplicate
            </button>
            {pages.length > 1 && (
              <button onClick={() => { deletePage(pageMenu.pageId); setPageMenu(null); }}
                className="w-full text-left px-3 py-1.5 flex items-center gap-2.5 hover:bg-red-50 text-red-500 transition-colors">
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
        </>
      )}

      {/* Add Person Modal */}
      {addPersonOpen && (
        <Modal title="Add to list" onClose={() => setAddPersonOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Full name</label>
              <input autoFocus value={pName} onChange={e => setPName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addPerson()}
                placeholder="e.g. John Smith"
                className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Color</label>
              <div className="mt-1.5 flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setPColor(c)} title="Pick color"
                    className={["w-8 h-8 rounded-lg border-2 transition-all", pColor === c ? "border-gray-800 scale-110 shadow-md" : "border-transparent hover:scale-105"].join(" ")}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="mt-3 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 text-center shadow-sm truncate" style={{ backgroundColor: pColor }}>
                {pName || "Name preview"}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setAddPersonOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
              <button onClick={addPerson} disabled={!pName.trim()} className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">Add</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Table Modal */}
      {addTableOpen && (
        <Modal title="Add table" onClose={() => setAddTableOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Table name</label>
              <input autoFocus value={tName} onChange={e => setTName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTable()}
                className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {([["top", "Side A", tTop, setTTop], ["bottom", "Side B", tBot, setTBot]] as const).map(([, label, val, setVal]) => (
                <div key={label}>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
                  <div className="mt-1.5 flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2">
                    <button onClick={() => setVal(v => Math.max(1, v - 1))} title="Fewer seats" className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-600 font-bold text-sm">−</button>
                    <span className="flex-1 text-center font-bold text-gray-800">{val}</span>
                    <button onClick={() => setVal(v => Math.min(50, v + 1))} title="More seats" className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-600 font-bold text-sm">+</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center">Total: {tTop + tBot} seats ({tTop} + {tBot})</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setAddTableOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
              <button onClick={addTable} disabled={!tName.trim()} className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">Add</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Person Modal */}
      {editingPersonId && people[editingPersonId] && (
        <EditPersonModal
          person={people[editingPersonId]}
          onSave={(name, color, tags) => updatePerson(editingPersonId, name, color, tags)}
          onDelete={() => { deletePerson(editingPersonId); setEditingPersonId(null); }}
          onClose={() => setEditingPersonId(null)}
          tagDefs={tagDefs}
          onManageTags={() => setTagsModalOpen(true)}
        />
      )}

      {/* Manage Tags Modal */}
      {tagsModalOpen && (
        <ManageTagsModal
          tagDefs={tagDefs}
          onAdd={addTagDef}
          onRename={renameTagDef}
          onColor={setTagDefColor}
          onDelete={deleteTagDef}
          onClose={() => setTagsModalOpen(false)}
        />
      )}

      {/* Welcome / onboarding (first visit) */}
      {showWelcome && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={dismissWelcome}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900">Welcome to Event Seating Planner 🎉</h2>
            <p className="text-sm text-gray-500 mt-1.5">Plan who sits where at your event — drag guests onto tables, in seconds.</p>
            <div className="mt-5 space-y-3">
              {[
                { Icon: UserPlus, c: "text-violet-600 bg-violet-50", t: "Add guests", d: "Build your guest list; give people colors and tags." },
                { Icon: Table2, c: "text-blue-600 bg-blue-50", t: "Create tables", d: "Rectangular or round, with any number of seats." },
                { Icon: UserCheck, c: "text-green-600 bg-green-50", t: "Drag & drop", d: "Assign, swap, reorder or remove people on the canvas." },
                { Icon: Copy, c: "text-amber-600 bg-amber-50", t: "Pages", d: "Try multiple layouts as separate drafts." },
                { Icon: Cloud, c: "text-teal-600 bg-teal-50", t: "Saved in your browser", d: "No account needed. Your work survives refreshes." },
              ].map(({ Icon, c, t, d }) => (
                <div key={t} className="flex items-start gap-3">
                  <div className={["w-8 h-8 rounded-lg flex items-center justify-center shrink-0", c].join(" ")}><Icon size={16} /></div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{t}</div>
                    <div className="text-xs text-gray-500">{d}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={dismissWelcome}
              className="mt-6 w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors">
              Get started
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
