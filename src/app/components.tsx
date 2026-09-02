// ─── Componenti presentazionali (estratti da App.tsx) ─────────────────────────
import React, { useState, useEffect, useLayoutEffect, useRef, ReactNode, DragEvent, MouseEvent as RMouseEvent } from "react";
import { Plus, Trash2, X, GripVertical, ArrowUpDown, ArrowLeftRight, PanelLeft, PanelRight, RotateCwSquare, RotateCcwSquare, UserPlus, Table2, UserCheck, Copy, Cloud } from "lucide-react";
import { useT } from "./i18n";
import {
  Person, TableData, DragSrc, SelectInfo, Page, TagDef,
  SEAT_W, SEAT_H, TAG_PALETTE, COLORS,
} from "./types";

export function VectorSquare({ size = 18 }: { size?: number }) {
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
export function GlobalTooltip() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; place: "top" | "bottom" } | null>(null);
  const timer = useRef<number | null>(null);
  const currentEl = useRef<HTMLElement | null>(null);

  const draggingRef = useRef(false);

  useEffect(() => {
    const DELAY = 550;
    const clearTimer = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
    const hide = () => { clearTimer(); currentEl.current = null; setTip(null); };

    const onOver = (e: globalThis.MouseEvent) => {
      if (draggingRef.current) return;
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
    const onDragStart = () => { draggingRef.current = true; hide(); };
    const onDragEnd = () => { draggingRef.current = false; };
    // Anche i drag basati su mouse (spostamento tavoli/zone, resize) devono
    // sopprimere il tooltip: appena si preme si nasconde e resta soppresso finché
    // non si rilascia; dopo, riappare solo rientrando in hover.
    const onMouseDown = () => { draggingRef.current = true; hide(); };
    const onMouseUp = () => { draggingRef.current = false; };
    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mouseout", onOut, true);
    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("mouseup", onMouseUp, true);
    document.addEventListener("dragstart", onDragStart, true);
    document.addEventListener("dragend", onDragEnd, true);
    document.addEventListener("drop", onDragEnd, true);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("wheel", hide, true);
    return () => {
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mouseout", onOut, true);
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("mouseup", onMouseUp, true);
      document.removeEventListener("dragstart", onDragStart, true);
      document.removeEventListener("dragend", onDragEnd, true);
      document.removeEventListener("drop", onDragEnd, true);
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

// ─── Modal ────────────────────────────────────────────────────────────────────

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const t = useT();
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} title={t("close")} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── EditPersonModal ──────────────────────────────────────────────────────────

export function EditPersonModal({ person, onSave, onDelete, onClose, tagDefs, onAddTag, onRenameTag, onColorTag, onDeleteTag }: {
  person: Person;
  onSave: (name: string, color: string, tags: string[], allergies: string, notes: string) => void;
  onDelete: () => void;
  onClose: () => void;
  tagDefs: TagDef[];
  onAddTag: (name: string) => void;
  onRenameTag: (oldName: string, newName: string) => void;
  onColorTag: (name: string, color: string) => void;
  onDeleteTag: (name: string) => void;
}) {
  const [name, setName] = useState(person.name);
  const [color, setColor] = useState(person.color);
  const [tags, setTags] = useState<string[]>(person.tags ?? []);
  const [allergies, setAllergies] = useState(person.allergies ?? "");
  const [notes, setNotes] = useState(person.notes ?? "");
  const [managing, setManaging] = useState(false);
  const t = useT();

  const toggle = (tag: string) =>
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  const save = () => name.trim() && onSave(name.trim(), color, tags, allergies.trim(), notes.trim());

  return (
    <Modal title={t("editPerson")} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{t("fullName")}</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && save()}
            className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{t("color")}</label>
          <div className="mt-1.5 flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} title={t("pickColor")}
                className={["w-8 h-8 rounded-lg border-2 transition-all", color === c ? "border-gray-800 scale-110 shadow-md" : "border-transparent hover:scale-105"].join(" ")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{t("tags")}</label>
            <button onClick={() => setManaging(v => !v)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              {managing ? t("done") : t("manageTags")}
            </button>
          </div>
          {managing ? (
            <div className="mt-1.5 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
              <TagEditorList tagDefs={tagDefs} onAdd={onAddTag} onRename={onRenameTag} onColor={onColorTag} onDelete={onDeleteTag} />
            </div>
          ) : (
            <div className="mt-1.5 flex gap-2 flex-wrap">
              {tagDefs.length === 0 && <span className="text-xs text-gray-400">{t("noTagsHint")}</span>}
              {tagDefs.map(({ name, color }) => {
                const active = tags.includes(name);
                return (
                  <button key={name} onClick={() => toggle(name)}
                    title={active ? t("removeTagTip", { name }) : t("addTagTip", { name })}
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
          )}
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{t("allergies")}</label>
          <input value={allergies} onChange={e => setAllergies(e.target.value)}
            placeholder={t("allergiesPh")}
            className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{t("notes")}</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder={t("notesPh")}
            className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 resize-y"
          />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button onClick={onDelete} className="px-4 py-2.5 rounded-xl border border-red-200 text-sm text-red-500 hover:bg-red-50 font-medium transition-colors">
            {t("delete")}
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-medium">
            {t("cancel")}
          </button>
          <button onClick={save} disabled={!name.trim()}
            className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-40">
            {t("save")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── TagEditorList — lista CRUD dei tag (riusabile inline o dentro una modale) ──

export function TagEditorList({ tagDefs, onAdd, onRename, onColor, onDelete }: {
  tagDefs: TagDef[];
  onAdd: (name: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onColor: (name: string, color: string) => void;
  onDelete: (name: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const t = useT();
  const add = () => { if (newName.trim()) { onAdd(newName); setNewName(""); } };
  return (
    <div className="space-y-3">
      {tagDefs.length === 0 && <p className="text-xs text-gray-400">{t("noTagsAdd")}</p>}
      <div className="space-y-2 max-h-56 overflow-y-auto">
        {tagDefs.map(td => (
          <div key={td.name} className="flex items-center gap-2">
            <div className="flex items-center gap-1 shrink-0">
              {TAG_PALETTE.map(c => (
                <button key={c} onClick={() => onColor(td.name, c)} title={t("color")}
                  className="w-5 h-5 rounded-full border-2 box-border transition-opacity hover:opacity-70"
                  style={{ backgroundColor: c, borderColor: td.color === c ? "#111827" : "transparent" }} />
              ))}
            </div>
            <input defaultValue={td.name} key={td.name + td.color}
              onBlur={e => { const v = e.target.value.trim(); if (v && v !== td.name) onRename(td.name, v); }}
              onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <button onClick={() => onDelete(td.name)} title={t("deleteTag")}
              className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") add(); }}
          placeholder={t("newTagName")}
          className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
        <button onClick={add} disabled={!newName.trim()}
          className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 flex items-center gap-1 shrink-0">
          <Plus size={14} /> {t("add")}
        </button>
      </div>
    </div>
  );
}

// ─── ManageTagsModal — CRUD dei tag (nome + colore) ───────────────────────────

export function ManageTagsModal({ tagDefs, onAdd, onRename, onColor, onDelete, onClose }: {
  tagDefs: TagDef[];
  onAdd: (name: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onColor: (name: string, color: string) => void;
  onDelete: (name: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <Modal title={t("manageTags")} onClose={onClose}>
      <TagEditorList tagDefs={tagDefs} onAdd={onAdd} onRename={onRename} onColor={onColor} onDelete={onDelete} />
    </Modal>
  );
}

// ─── InlineEditText — rename inline: il campo "abbraccia" il testo e le metriche
// di lettura/modifica sono identiche (stesso padding + bordo trasparente→blu),
// così non c'è alcuno spostamento passando da lettura a modifica. ───────────────

export function InlineEditText({
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

export function TableCard({
  table, people, draggingId, dragOverKey, selected,
  onSeatDragOver, onSeatDrop, onPersonDragStart, onPersonDragEnd,
  onSeatClick, onGapDragOver, onGapDrop, onGapClick,
  onAdjust, onRemoveSlot, onInsertSlot, onDelete, onRename, onStartTableDrag, onPersonClick, onFlip, onFlipH,
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
  onInsertSlot: (tableId: string, row: "top" | "bottom", afterIdx: number) => void;
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
  const t = useT();
  const occupied = [...table.topSeats, ...table.bottomSeats].filter(Boolean).length;
  const total = table.topSeats.length + table.bottomSeats.length;
  const maxCols = Math.max(table.topSeats.length, table.bottomSeats.length);

  const isDragging = !!draggingId;
  const hasSelected = !!selected;

  const renderSeat = (row: "top" | "bottom", personId: string | null, idx: number, dims?: { w: number; h: number }, counterDeg = 0) => {
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
        style={{ width: dims?.w ?? SEAT_W, height: dims?.h ?? SEAT_H, flexShrink: 0, transform: counterDeg ? `rotate(${counterDeg}deg)` : undefined }}
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
            title={t("chipEditMove", { name: person.name })}
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
            {/* Numero solo per i rotondi (senza asse). Nei rettangolari il
                riferimento è l'asse laterale: evita ripetizioni. */}
            {table.shape === "round" && (
              <span className="text-[10px] text-gray-300 font-medium group-hover/empty:opacity-0 transition-opacity">
                {idx + 1}
              </span>
            )}
            <button
              onClick={e => { e.stopPropagation(); onRemoveSlot(table.id, row, idx); }}
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/empty:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
              title={t("removeSlot")}
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

  const renderGap = (row: "top" | "bottom", afterIdx: number, axis: "h" | "v" = "h") => {
    const key = `G|${table.id}|${row}|${afterIdx}`;
    const isOver = dragOverKey === key;
    const showInsert = isOver && isDragging;
    const showClickTarget = hasSelected && !isDragging;
    const horiz = axis === "h";

    return (
      <div
        key={key}
        style={{ width: horiz ? GAP_NORMAL : SEAT_W, height: horiz ? SEAT_H : GAP_NORMAL, flexShrink: 0, position: "relative" }}
        className={"group/gap " + (showClickTarget ? "cursor-pointer" : "")}
        onDragOver={e => onGapDragOver(e, key)}
        onDrop={e => onGapDrop(e, table.id, row, afterIdx)}
        onClick={() => onGapClick(table.id, row, afterIdx)}
      >
        {/* Invisible wider hit area so the gap is easier to target */}
        <div style={{ position: "absolute", inset: horiz ? "0 -6px" : "-6px 0", zIndex: 5 }} />
        {/* Hover: linea + pulsante "+" per inserire un posto vuoto qui */}
        {!isDragging && (
          <div className="opacity-0 group-hover/gap:opacity-100 transition-opacity" style={{ position: "absolute", inset: 0, zIndex: 16, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div style={{ position: "absolute", zIndex: 1, borderRadius: 4, background: "#3b82f6", ...(horiz ? { left: "50%", top: 4, bottom: 4, width: 2, transform: "translateX(-50%)" } : { top: "50%", left: 4, right: 4, height: 2, transform: "translateY(-50%)" }) }} />
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onInsertSlot(table.id, row, afterIdx); }}
              title={t("addEmptySeat")}
              style={{ position: "relative", zIndex: 2, pointerEvents: "auto", width: 18, height: 18, flexShrink: 0, borderRadius: "50%", background: "#3b82f6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.3)", cursor: "pointer" }}>
              <Plus size={12} style={{ flexShrink: 0 }} />
            </button>
          </div>
        )}
        {/* Blue insert line */}
        {showInsert && (
          <div style={horiz ? {
            position: "absolute", left: "50%", top: 2, bottom: 2,
            width: 3, transform: "translateX(-50%)",
            borderRadius: 4, zIndex: 20,
            background: "linear-gradient(180deg,#3b82f6,#6366f1)",
            boxShadow: "0 0 8px 2px rgba(99,102,241,0.5)",
          } : {
            position: "absolute", top: "50%", left: 2, right: 2,
            height: 3, transform: "translateY(-50%)",
            borderRadius: 4, zIndex: 20,
            background: "linear-gradient(90deg,#3b82f6,#6366f1)",
            boxShadow: "0 0 8px 2px rgba(99,102,241,0.5)",
          }} />
        )}
        {/* Click-to-insert line (softer) */}
        {showClickTarget && !showInsert && (
          <div style={horiz ? {
            position: "absolute", left: "50%", top: 4, bottom: 4,
            width: 2, transform: "translateX(-50%)",
            borderRadius: 4, zIndex: 10,
            background: "rgba(59,130,246,0.25)",
          } : {
            position: "absolute", top: "50%", left: 4, right: 4,
            height: 2, transform: "translateY(-50%)",
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
    // Box rettangolare: la larghezza deve contenere le sedie estreme (seatW), ma
    // l'altezza solo (seatH). Così sopra/sotto non resta spazio morto e il
    // titolo (ancorato al bordo superiore) sta vicino al tavolo.
    const boxW = 2 * radius + seatW + 8;
    const boxH = 2 * radius + seatH + 8;
    const cx = boxW / 2, cy = boxH / 2;
    const discD = Math.max(72, 2 * radius - seatH - 8);
    const seatPad = 5;
    return (
      <div
        style={{ position: "absolute", left: table.x, top: table.y, zIndex: isSelected ? 2 : 1,
          width: boxW, height: boxH, borderRadius: 28,
          border: `2px solid ${isSelected ? "#3b82f6" : "transparent"}`, boxSizing: "border-box", cursor: "grab" }}
        onMouseDown={e => { if (!(e.target as HTMLElement).closest("[data-seat]")) onStartTableDrag(e); }}
        onDragOver={e => { if (draggingId) onTableAreaDragOver(e); }}
        onDrop={onTableAreaDrop}
      >
        {/* Superficie del tavolo (disco centrale) */}
        <div style={{ position: "absolute", left: cx - discD / 2, top: cy - discD / 2, width: discD, height: discD,
          borderRadius: "50%", background: "#fff", border: "1px solid #e5e7eb", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }} />
        {/* Sedie disposte in cerchio. I posti vuoti stanno in un container bianco
            con leggero padding, così si vedono sul canvas grigio. */}
        {ring.map((pid, i) => {
          const ang = -Math.PI / 2 + (i * 2 * Math.PI) / N;
          const sx = cx + radius * Math.cos(ang) - seatW / 2;
          const sy = cy + radius * Math.sin(ang) - seatH / 2;
          return (
            <div key={i} style={{ position: "absolute", left: pid ? sx : sx - seatPad, top: pid ? sy : sy - seatPad }}>
              {pid
                ? renderSeat("top", pid, i, { w: seatW, h: seatH })
                : <div style={{ background: "#fff", borderRadius: 14, padding: seatPad, boxShadow: "0 1px 4px rgba(0,0,0,0.10)" }}>
                    {renderSeat("top", pid, i, { w: seatW, h: seatH })}
                  </div>}
            </div>
          );
        })}
        {/* Zone di inserimento tra sedie adiacenti (riordino nell'anello) —
            attive solo durante un drag; indicatore blu radiale al passaggio */}
        {ring.map((_, i) => {
          const afterIdx = i + 1;
          const mid = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / N;
          const gx = cx + radius * Math.cos(mid);
          const gy = cy + radius * Math.sin(mid);
          const key = `G|${table.id}|top|${afterIdx}`;
          const showInsert = dragOverKey === key && isDragging;
          const HZ = 36;
          return (
            <div key={`g${i}`} className="group/gap"
              style={{ position: "absolute", left: gx - HZ / 2, top: gy - HZ / 2, width: HZ, height: HZ, zIndex: 8, pointerEvents: "auto", display: "flex", alignItems: "center", justifyContent: "center" }}
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
              {!isDragging && (
                <>
                  <div className="opacity-0 group-hover/gap:opacity-100 transition-opacity" style={{
                    position: "absolute", left: "50%", top: "50%", zIndex: 1,
                    width: 3, height: seatH, transform: `translate(-50%,-50%) rotate(${(mid * 180) / Math.PI + 90}deg)`,
                    borderRadius: 4, background: "#3b82f6",
                  }} />
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); onInsertSlot(table.id, "top", afterIdx); }}
                    title={t("addEmptySeat")}
                    className="opacity-0 group-hover/gap:opacity-100 transition-opacity"
                    style={{ position: "relative", zIndex: 2, width: 18, height: 18, flexShrink: 0, borderRadius: "50%", background: "#3b82f6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.3)", cursor: "pointer" }}>
                    <Plus size={12} style={{ flexShrink: 0 }} />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const ROW_LABEL_W = 24; // distanza uniforme fra le etichette d'asse (A/B, numeri) e gli slot
  const AXIS_GAP = 16; // distanza fra le due righe (0°) / colonne (90°) — uguale
  const LABEL_H = 16; // altezza fissa della riga etichetta (per allineare i numeri in verticale)
  // Orientamento a scaloni di 90°. Per orizzontale (0/180) si usa il layout a
  // righe; per verticale (90/270) il layout a colonne. Il residuo di 180° è
  // applicato via CSS e ogni sedia/etichetta è contro-ruotata così i NOMI
  // restano sempre orizzontali (nessuna sovrapposizione: 180° conserva l'ingombro).
  const deg = (((table.rotation ?? 0) % 360) + 360) % 360;
  const axisVertical = deg === 90 || deg === 270;
  const extra = axisVertical ? deg - 90 : deg; // 0 | 180
  const cDeg = -extra; // contro-rotazione dei contenuti

  const rowLabel = (letter: string, vertical: boolean) => (
    <div style={{ width: vertical ? SEAT_W : ROW_LABEL_W, height: vertical ? LABEL_H : SEAT_H, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: vertical ? "center" : "flex-end", transform: cDeg ? `rotate(${cDeg}deg)` : undefined }} className="text-[10px] text-gray-300 font-medium">{letter}</div>
  );

  return (
    <div
      data-table-id={table.id}
      className="bg-white rounded-2xl"
      style={{ position: "absolute", left: table.x, top: table.y, zIndex: isSelected ? 2 : 1,
        border: `2px solid ${isSelected ? "#3b82f6" : "#e5e7eb"}`, cursor: "grab",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        transform: extra ? `rotate(${extra}deg)` : undefined, transformOrigin: "center center" }}
      onMouseDown={e => { if (!(e.target as HTMLElement).closest("[data-seat]")) onStartTableDrag(e); }}
      onDragOver={e => { if (draggingId) onTableAreaDragOver(e); }}
      onDrop={onTableAreaDrop}
    >
      <div className="p-5">
        {axisVertical ? (
          /* VERTICALE: due colonne (A / B), pill orizzontali impilati, numeri a sx */
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            {/* Numeri: una sola colonna a sinistra, copre maxCols e si allinea
                a ogni riga (anche con discrepanza di posti fra A e B). */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginRight: 8, flexShrink: 0 }}>
              <div style={{ height: LABEL_H }} />
              <div style={{ height: GAP_NORMAL }} />
              {Array.from({ length: maxCols }).map((_, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ height: SEAT_H, display: "flex", alignItems: "center", justifyContent: "flex-end", transform: cDeg ? `rotate(${cDeg}deg)` : undefined }} className="text-[10px] text-gray-300 font-medium">{i + 1}</div>
                  <div style={{ height: GAP_NORMAL }} />
                </div>
              ))}
            </div>
            {/* Colonne A / B (pill orizzontali) */}
            <div style={{ display: "flex", gap: AXIS_GAP, alignItems: "flex-start" }}>
              {(["top", "bottom"] as const).map(row => {
                const seats = row === "top" ? table.topSeats : table.bottomSeats;
                return (
                  <div key={row} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    {rowLabel(row === "top" ? "A" : "B", true)}
                    {renderGap(row, 0, "v")}
                    {seats.map((pid, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        {renderSeat(row, pid, i, undefined, cDeg)}
                        {renderGap(row, i + 1, "v")}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ORIZZONTALE: due righe (A / B) */
          <div style={{ display: "inline-block" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {rowLabel("A", false)}
              {renderGap("top", 0)}
              {table.topSeats.map((pid, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center" }}>
                  {renderSeat("top", pid, i, undefined, cDeg)}
                  {renderGap("top", i + 1)}
                </div>
              ))}
            </div>

            <div style={{ height: AXIS_GAP }} />

            <div style={{ display: "flex", alignItems: "center" }}>
              {rowLabel("B", false)}
              {renderGap("bottom", 0)}
              {table.bottomSeats.map((pid, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center" }}>
                  {renderSeat("bottom", pid, i, undefined, cDeg)}
                  {renderGap("bottom", i + 1)}
                </div>
              ))}
            </div>

            {/* Numeri posti — allineati sotto ogni sedia */}
            <div style={{ display: "flex", marginTop: 6 }}>
              <div style={{ width: ROW_LABEL_W + GAP_NORMAL, flexShrink: 0 }} />
              {Array.from({ length: maxCols }).map((_, i) => (
                <div key={i} style={{ display: "flex" }}>
                  <div style={{ width: SEAT_W, flexShrink: 0, transform: cDeg ? `rotate(${cDeg}deg)` : undefined }} className="text-center text-[10px] text-gray-300 font-medium">{i + 1}</div>
                  <div style={{ width: GAP_NORMAL, flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TableChrome — titolo + toolbar del tavolo, resi in un layer SOPRA tutti i
// frame così i titoli non vengono mai coperti dai tavoli vicini. ────────────────

export function TableChrome({
  table, occupied, total, zoom, isSelected,
  onSelect, onStartTableDrag, onRename, onAdjust, onFlip, onFlipH, onRotate, onDelete,
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
  onRotate: (deg: number) => void;
  onDelete: () => void;
}) {
  const t = useT();
  const isRound = table.shape === "round";
  const deg = (((table.rotation ?? 0) % 360) + 360) % 360;
  // Misura l'ingombro (non ruotato) del frame per ancorare il titolo al centro
  // del tavolo e farlo "seguire" la rotazione.
  const [dim, setDim] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = document.querySelector(`[data-table-id="${table.id}"]`) as HTMLElement | null;
    if (el) {
      const w = el.offsetWidth, h = el.offsetHeight;
      setDim(prev => (prev.w === w && prev.h === h) ? prev : { w, h });
    }
  }, [table.id, table.topSeats.length, table.bottomSeats.length, table.shape, table.rotation, zoom]);
  const axisVertical = deg === 90 || deg === 270;
  const extra = axisVertical ? deg - 90 : deg; // 0 | 180 (residuo applicato via CSS al frame)
  return (
    <div style={{ position: "absolute", left: table.x, top: table.y }}>
      {/* Layer di rotazione: ruota il titolo attorno al centro del frame così
          da seguirlo; il contenuto viene contro-ruotato per restare leggibile. */}
      <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: `${dim.w / 2}px ${dim.h / 2}px`, transform: extra ? `rotate(${extra}deg)` : undefined }}>
      {/* Contro-scala per dimensione costante a ogni zoom; ancorato sopra il frame */}
      <div style={{ position: "absolute", left: 0, bottom: "100%", transformOrigin: "left bottom", transform: `scale(${1 / zoom})`, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, paddingBottom: 6, pointerEvents: "auto" }}>
        {isSelected && (
          <div className="flex items-center gap-1.5 bg-white rounded-xl shadow-lg border border-gray-200 px-2 h-11" onMouseDown={e => e.stopPropagation()}
            style={{ transform: extra ? `rotate(${-extra}deg)` : undefined }}>
            <span title={t("occupiedTotal")} className="text-xs text-gray-400 font-medium px-1 tabular-nums">{occupied}/{total}</span>
            <div className="w-px h-5 bg-gray-200" />
            {isRound ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400 font-semibold px-1">{t("seats")}</span>
                <button onClick={() => onAdjust(table.id, "top", -1)} title={t("removeSeat")} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 text-lg leading-none font-bold">−</button>
                <span title={t("numberOfSeats")} className="w-5 text-center text-sm font-bold text-gray-700">{table.topSeats.length}</span>
                <button onClick={() => onAdjust(table.id, "top", 1)} title={t("addSeat")} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 text-lg leading-none font-bold">+</button>
              </div>
            ) : (
              <>
                {(["top", "bottom"] as const).map(row => (
                  <div key={row} className="flex items-center gap-1">
                    <span title={t("rowLabel", { r: row === "top" ? "A" : "B" })} className="text-xs text-gray-400 font-semibold w-3 text-center">{row === "top" ? "A" : "B"}</span>
                    <button onClick={() => onAdjust(table.id, row, -1)} title={t("removeSeatRow", { r: row === "top" ? "A" : "B" })} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 text-lg leading-none font-bold">−</button>
                    <span title={t("seatsInRow", { r: row === "top" ? "A" : "B" })} className="w-5 text-center text-sm font-bold text-gray-700">{row === "top" ? table.topSeats.length : table.bottomSeats.length}</span>
                    <button onClick={() => onAdjust(table.id, row, 1)} title={t("addSeatRow", { r: row === "top" ? "A" : "B" })} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 text-lg leading-none font-bold">+</button>
                  </div>
                ))}
                <div className="w-px h-5 bg-gray-200" />
                <button onClick={onFlipH} title={t("flipH")} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"><ArrowLeftRight size={18} /></button>
                <button onClick={onFlip} title={t("flipV")} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"><ArrowUpDown size={18} /></button>
                <div className="w-px h-5 bg-gray-200" />
                {/* Rotazione: unico pulsante che alterna orizzontale (0°) / verticale (90°) */}
                <button onClick={() => onRotate(deg === 90 ? 0 : 90)} title={deg === 90 ? t("makeHorizontal") : t("makeVertical")}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                  {deg === 90 ? <RotateCcwSquare size={17} /> : <RotateCwSquare size={17} />}
                </button>
              </>
            )}
            <div className="w-px h-5 bg-gray-200" />
            <button onClick={onDelete} title={t("deleteTable")} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={18} /></button>
          </div>
        )}
        {/* Titolo: trascina + seleziona (rename su doppio click) */}
        <div onMouseDown={onStartTableDrag} onClick={onSelect} style={{ cursor: "grab", maxWidth: 360, display: "flex", alignItems: "center", gap: 4, transform: extra ? `rotate(${-extra}deg)` : undefined }}>
          <GripVertical size={13} className="shrink-0" style={{ color: isSelected ? "#2563eb" : "#9ca3af" }} />
          <InlineEditText value={table.name} onCommit={onRename} trigger="dblclick" title={t("dblRename")} textStyle={{ fontSize: 13, fontWeight: 600, color: isSelected ? "#2563eb" : "#6b7280" }} />
        </div>
      </div>
      </div>
    </div>
  );
}

// ─── PageItem ─────────────────────────────────────────────────────────────────

export function PageItem({ page, isActive, onSwitch, onRename, onContextMenu }: {
  page: Page; isActive: boolean;
  onSwitch: () => void; onRename: (name: string) => void;
  onContextMenu: (x: number, y: number) => void;
}) {
  const t = useT();
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
          title={t("dblRename")}
          textStyle={{ fontSize: 12, fontWeight: 500, color: "inherit" }}
        />
      </div>
    </div>
  );
}

// ─── SidebarToggle — stessa label + icona riusata sia come TITOLO (sidebar
// aperta, click = chiudi) sia come pulsante flottante (chiusa, click = apri). ────

export function SidebarToggle({ label, side, open, onToggle, variant }: {
  label: string;
  side: "left" | "right";
  open: boolean;
  onToggle: () => void;
  variant: "header" | "floating";
}) {
  const t = useT();
  const Icon = side === "left" ? PanelLeft : PanelRight;
  const icon = <Icon size={variant === "floating" ? 19 : 19} className="shrink-0" />;
  const text = (
    <span className={variant === "header" ? "text-base font-medium" : "text-sm font-semibold"}>
      {label}
    </span>
  );
  const iconFirst = variant === "header" ? true : side === "left";
  return (
    <button onClick={onToggle} title={open ? t("hide", { label }) : t("show", { label })}
      className={variant === "floating"
        ? "h-11 px-4 flex items-center gap-2.5 bg-white rounded-xl shadow-md border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        : "flex items-center gap-3.5 text-gray-800 hover:text-gray-900 transition-colors min-w-0"}>
      {iconFirst ? <>{icon}{text}</> : <>{text}{icon}</>}
    </button>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

// ─── WelcomeModal — onboarding alla prima visita ──────────────────────────────
export function WelcomeModal({ onDismiss }: { onDismiss: () => void }) {
  const t = useT();
  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={onDismiss}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-900">{t("welcomeTitle")}</h2>
        <p className="text-sm text-gray-500 mt-1.5">{t("welcomeSub")}</p>
        <div className="mt-5 space-y-3">
          {[
            { Icon: UserPlus, c: "text-violet-600 bg-violet-50", title: t("obGuestsT"), d: t("obGuestsD") },
            { Icon: Table2, c: "text-blue-600 bg-blue-50", title: t("obTablesT"), d: t("obTablesD") },
            { Icon: UserCheck, c: "text-green-600 bg-green-50", title: t("obDndT"), d: t("obDndD") },
            { Icon: Copy, c: "text-amber-600 bg-amber-50", title: t("obPagesT"), d: t("obPagesD") },
            { Icon: Cloud, c: "text-teal-600 bg-teal-50", title: t("obSavedT"), d: t("obSavedD") },
          ].map(({ Icon, c, title, d }) => (
            <div key={title} className="flex items-start gap-3">
              <div className={["w-8 h-8 rounded-lg flex items-center justify-center shrink-0", c].join(" ")}><Icon size={16} /></div>
              <div>
                <div className="text-sm font-semibold text-gray-800">{title}</div>
                <div className="text-xs text-gray-500">{d}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onDismiss}
          className="mt-6 w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors">
          {t("getStarted")}
        </button>
      </div>
    </div>
  );
}
