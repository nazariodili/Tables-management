import { PanelLeft, PanelRight } from "lucide-react";
import { useT } from "../i18n";
import { Page } from "../types";
import { InlineEditText } from "./InlineEditText";

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

