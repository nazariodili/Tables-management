import { useCallback, useRef } from "react";
import { Page, TableData, Shape } from "../types";

// Undo/redo con snapshot dell'INTERO stato pagine (tavoli + zone), così copre
// tutto: spostamenti, rotazioni, aggiunta/modifica zone, sedute, ecc.
// Lo stato "vive" in App; qui gestiamo solo gli stack e i wrapper che
// registrano uno snapshot prima di ogni modifica.
export function useHistory(opts: {
  pages: Page[];
  setPages: (p: Page[]) => void;
  setTables: (u: TableData[] | ((prev: TableData[]) => TableData[])) => void;
  setShapes: (u: Shape[] | ((prev: Shape[]) => Shape[])) => void;
}) {
  const { pages, setPages, setTables, setShapes } = opts;
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const undoStack = useRef<Page[][]>([]);
  const redoStack = useRef<Page[][]>([]);
  // Segna se la gesture corrente (drag/resize) ha già registrato uno snapshot.
  const gestureSnappedRef = useRef(false);

  const pushHistory = useCallback(() => {
    undoStack.current.push(pagesRef.current);
    if (undoStack.current.length > 200) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  // Come setTables/setShapes, ma registrano prima uno snapshot in history.
  const setTablesH = useCallback((updater: TableData[] | ((prev: TableData[]) => TableData[])) => {
    pushHistory();
    setTables(updater);
  }, [pushHistory, setTables]);
  const setShapesH = useCallback((updater: Shape[] | ((prev: Shape[]) => Shape[])) => {
    pushHistory();
    setShapes(updater);
  }, [pushHistory, setShapes]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (prev !== undefined) { redoStack.current.push(pagesRef.current); setPages(prev); }
  }, [setPages]);
  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (next !== undefined) { undoStack.current.push(pagesRef.current); setPages(next); }
  }, [setPages]);
  const clearHistory = useCallback(() => { undoStack.current = []; redoStack.current = []; }, []);

  return { pushHistory, setTablesH, setShapesH, undo, redo, clearHistory, gestureSnappedRef };
}
