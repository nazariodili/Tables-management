import { UserPlus, SquarePlus, GripVertical, Copy, Cloud } from "lucide-react";
import { useT } from "../i18n";
import { VectorSquare } from "./icons";

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
            { Icon: SquarePlus, c: "text-blue-600 bg-blue-50", title: t("obTablesT"), d: t("obTablesD") },
            { Icon: VectorSquare, c: "text-amber-600 bg-amber-50", title: t("obZonesT"), d: t("obZonesD") },
            { Icon: GripVertical, c: "text-green-600 bg-green-50", title: t("obDndT"), d: t("obDndD") },
            { Icon: Copy, c: "text-rose-600 bg-rose-50", title: t("obPagesT"), d: t("obPagesD") },
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
