import React, { useState, useLayoutEffect, DragEvent, MouseEvent as RMouseEvent } from "react";
import { X, Plus, Trash2, GripVertical, ArrowUpDown, ArrowLeftRight, RotateCwSquare, RotateCcwSquare } from "lucide-react";
import { useT } from "../i18n";
import { Person, TableData, DragSrc, SelectInfo, SEAT_W, SEAT_H } from "../types";
import { InlineEditText } from "./InlineEditText";
import { TagBadge } from "./tagIcons";

// ─── TableCard ────────────────────────────────────────────────────────────────

export function TableCard({
  table, people, draggingId, dragOverKey, selected,
  onSeatDragOver, onSeatDrop, onPersonDragStart, onPersonDragEnd,
  onSeatClick, onGapDragOver, onGapDrop, onGapClick,
  onAdjust, onRemoveSlot, onInsertSlot, onDelete, onRename, onStartTableDrag, onPersonClick, onFlip, onFlipH,
  zoom, isSelected, onSelect, willFreeOnRelease, onTableAreaDragOver, onTableAreaDrop, tagColor, tagIcon,
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
  tagIcon: (name: string) => string | undefined;
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
              <div className="flex items-center gap-1 mt-0.5">
                {person.tags.map(tag => (
                  <TagBadge key={tag} icon={tagIcon(tag)} color={tagColor(tag)} box={17} glyph={10} />
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
        data-table-id={table.id}
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

