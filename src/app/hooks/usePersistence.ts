import { useEffect, useRef, useState } from "react";
import { STORAGE_KEY, Page, Person, TagDef, bumpUidPast, collectIds } from "../types";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

// Idratazione iniziale da localStorage + salvataggio debounced a ogni modifica.
// Tutto lo stato "vive" in App; qui gestiamo solo lettura/scrittura + stato UI.
export function usePersistence(opts: {
  pages: Page[];
  people: Record<string, Person>;
  currentPageId: string;
  tagDefs: TagDef[];
  setPages: (p: Page[]) => void;
  setCurrentPageId: (id: string) => void;
  setPeople: (p: Record<string, Person>) => void;
  setTagDefs: (t: TagDef[]) => void;
}) {
  const { pages, people, currentPageId, tagDefs, setPages, setCurrentPageId, setPeople, setTagDefs } = opts;
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [loaded, setLoaded] = useState(false);

  // Valori iniziali (default) per il fallback "nessun dato salvato".
  const initialRef = useRef({ pages, people });

  // Idratazione una sola volta al mount.
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
      bumpUidPast(collectIds(initialRef.current.pages, initialRef.current.people));
    } catch (e) { console.warn("[load]", e); }
    finally { setLoaded(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salvataggio debounced a ogni modifica dello stato canvas.
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

  return { saveStatus, loaded };
}
