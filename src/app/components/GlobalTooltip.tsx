import { useState, useEffect, useRef } from "react";

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
