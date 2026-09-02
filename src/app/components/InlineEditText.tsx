import React, { useState, useRef, MouseEvent as RMouseEvent } from "react";

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
