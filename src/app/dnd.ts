import { TableData, DragSrc } from "./types";

// Destinazione di uno spostamento di una persona.
export type DragTarget =
  | { type: "pool" }
  | { type: "seat"; tableId: string; row: "top" | "bottom"; idx: number }
  | { type: "gap";  tableId: string; row: "top" | "bottom"; afterIdx: number };

// Applica uno spostamento e restituisce il NUOVO array di tavoli (funzione pura,
// nessun effetto collaterale). Regole:
//  - pool: libera il posto sorgente (se veniva da una sedia).
//  - seat: SWAP se sorgente è una sedia, altrimenti sfratta l'occupante al pool.
//  - gap: inserisce con shift; consuma il posto vuoto più vicino (mai rimuove una
//    persona); se la riga è piena cresce di uno slot.
// Restituisce lo stesso riferimento `tables` per i no-op (stessa sedia).
export function applyMove(tables: TableData[], personId: string, from: DragSrc, to: DragTarget): TableData[] {
  // ── To pool: libera dalla sedia ─────────────────────────────────────────────
  if (to.type === "pool") {
    if (from.type === "seat") {
      return tables.map(t => {
        if (t.id !== from.tableId) return t;
        const next = { ...t, topSeats: [...t.topSeats], bottomSeats: [...t.bottomSeats] };
        if (from.row === "top") next.topSeats[from.idx] = null;
        else next.bottomSeats[from.idx] = null;
        return next;
      });
    }
    return tables;
  }

  // ── To seat: SWAP se sorgente è una sedia, altrimenti sfratta ───────────────
  if (to.type === "seat") {
    if (from.type === "seat" && from.tableId === to.tableId && from.row === to.row && from.idx === to.idx) return tables;
    const next = tables.map(t => ({ ...t, topSeats: [...t.topSeats], bottomSeats: [...t.bottomSeats] }));
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
  }

  // ── To gap: INSERT + SHIFT ──────────────────────────────────────────────────
  const next = tables.map(t => ({ ...t, topSeats: [...t.topSeats], bottomSeats: [...t.bottomSeats] }));
  if (from.type === "seat" && from.tableId === to.tableId && from.row === to.row) {
    // Stessa riga: rimuovi e reinserisci (lunghezza invariata).
    const dt = next.find(t => t.id === to.tableId)!;
    const arr = to.row === "top" ? dt.topSeats : dt.bottomSeats;
    arr.splice(from.idx, 1);
    const insertAt = from.idx < to.afterIdx ? to.afterIdx - 1 : to.afterIdx;
    arr.splice(insertAt, 0, personId);
  } else {
    // Riga/tavolo diverso: azzera sorgente, inserisci nella destinazione.
    if (from.type === "seat") {
      const st = next.find(t => t.id === from.tableId)!;
      if (from.row === "top") st.topSeats[from.idx] = null;
      else st.bottomSeats[from.idx] = null;
    }
    const dt = next.find(t => t.id === to.tableId)!;
    const dstArr = to.row === "top" ? dt.topSeats : dt.bottomSeats;
    dstArr.splice(to.afterIdx, 0, personId); // lunghezza +1
    // Consuma UN posto vuoto (null): prima a destra dell'inserimento, poi il più
    // vicino a sinistra. Mai rimuovere una persona!
    let nullIdx = -1;
    for (let k = to.afterIdx + 1; k < dstArr.length; k++) { if (dstArr[k] === null) { nullIdx = k; break; } }
    if (nullIdx === -1) for (let k = to.afterIdx - 1; k >= 0; k--) { if (dstArr[k] === null) { nullIdx = k; break; } }
    if (nullIdx !== -1) dstArr.splice(nullIdx, 1);
    // se non c'è alcun null (riga piena): la riga cresce di uno slot
  }
  return next;
}
