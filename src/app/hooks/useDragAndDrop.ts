import { useCallback, useRef, useState, DragEvent } from "react";
import { DragSrc, SelectInfo, TableData } from "../types";
import { applyMove, DragTarget } from "../dnd";

// Tutta la logica di drag & drop (assegna/scambia/riordina/rimuovi) + il
// click-to-move. Lo stato di trascinamento vive qui; App usa i valori restituiti
// nel render. `setTablesH` (history) e `findPersonSeat` sono forniti da App.
export function useDragAndDrop(opts: {
  setTablesH: (u: TableData[] | ((prev: TableData[]) => TableData[])) => void;
  findPersonSeat: (personId: string) => DragSrc | null;
}) {
  const { setTablesH, findPersonSeat } = opts;

  const [dragInfo, setDragInfo] = useState<{ personId: string; src: DragSrc } | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectInfo | null>(null);
  const [poolHighlight, setPoolHighlight] = useState(false);
  const poolEnterCount = useRef(0);
  const dropHandled = useRef(false);

  // La trasformazione pura vive in dnd.ts (applyMove). Qui la si avvolge in
  // history + reset della selezione, saltando i no-op (stessa sedia / pool→pool).
  const doMove = useCallback((personId: string, from: DragSrc, to: DragTarget) => {
    const sameSeat = to.type === "seat" && from.type === "seat"
      && from.tableId === to.tableId && from.row === to.row && from.idx === to.idx;
    const poolNoop = to.type === "pool" && from.type !== "seat";
    if (!sameSeat && !poolNoop) setTablesH(prev => applyMove(prev, personId, from, to));
    setSelected(null);
  }, [setTablesH]);

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

  const onListDragStart = useCallback((e: DragEvent<HTMLDivElement>, personId: string) => {
    const seat = findPersonSeat(personId);
    onPersonDragStart(e, personId, seat ?? { type: "pool" });
  }, [findPersonSeat, onPersonDragStart]);

  const onPoolAreaClick = useCallback(() => {
    if (selected) doMove(selected.personId, selected.src, { type: "pool" });
  }, [selected, doMove]);

  // ── Zona pool (sidebar invitati): handler dedicati ──────────────────────────
  const onPoolDragEnter = useCallback(() => {
    poolEnterCount.current++;
    setPoolHighlight(true);
    setDragOverKey("pool");
  }, []);
  const onPoolDragLeave = useCallback(() => {
    poolEnterCount.current--;
    if (poolEnterCount.current <= 0) { poolEnterCount.current = 0; setPoolHighlight(false); setDragOverKey(null); }
  }, []);
  const onPoolDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);
  const onPoolDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dropHandled.current = true;
    if (dragInfo) doMove(dragInfo.personId, dragInfo.src, { type: "pool" });
    poolEnterCount.current = 0;
    setPoolHighlight(false);
  }, [dragInfo, doMove]);

  // Canvas: passando col drag fuori da un posto si azzera l'evidenziazione.
  const onCanvasDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverKey(null);
  }, []);

  // Reset completo (usato al cambio pagina).
  const resetDrag = useCallback(() => {
    setSelected(null);
    setDragInfo(null);
    setDragOverKey(null);
  }, []);

  return {
    dragInfo, dragOverKey, selected, setSelected, poolHighlight,
    doMove, onPersonDragStart, onPersonDragEnd, onSeatDragOver, onSeatDrop,
    onTableAreaDragOver, onTableAreaDrop, onGapDragOver, onGapDrop, onGapClick,
    onListDragStart, onPoolAreaClick,
    onPoolDragEnter, onPoolDragLeave, onPoolDragOver, onPoolDrop, onCanvasDragOver,
    resetDrag,
  };
}
