import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useT } from "../i18n";
import { Person, TagDef, COLORS, TAG_PALETTE } from "../types";
import { Modal } from "./Modal";
import { TagIcon, TagBadge, TAG_ICON_KEYS } from "./tagIcons";

// ─── PersonModal — stessa modale per aggiunta (vuota) e modifica (precompilata).
// In modalità "add" non c'è il pulsante Delete e cambiano titolo/label del save. ─

export function EditPersonModal({ person, onSave, onDelete, onClose, tagDefs, onAddTag, onRenameTag, onColorTag, onIconTag, onDeleteTag, title, saveLabel }: {
  person: Person;
  onSave: (name: string, color: string, tags: string[], allergies: string, notes: string) => void;
  onDelete?: () => void;
  onClose: () => void;
  tagDefs: TagDef[];
  onAddTag: (name: string) => void;
  onRenameTag: (oldName: string, newName: string) => void;
  onColorTag: (name: string, color: string) => void;
  onIconTag: (name: string, icon: string) => void;
  onDeleteTag: (name: string) => void;
  title?: string;
  saveLabel?: string;
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
    <Modal title={title ?? t("editPerson")} onClose={onClose}>
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
              <TagEditorList tagDefs={tagDefs} onAdd={onAddTag} onRename={onRenameTag} onColor={onColorTag} onIcon={onIconTag} onDelete={onDeleteTag} />
            </div>
          ) : (
            <div className="mt-1.5 flex gap-2 flex-wrap">
              {tagDefs.length === 0 && <span className="text-xs text-gray-400">{t("noTagsHint")}</span>}
              {tagDefs.map(({ name, color, icon }) => {
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
                    <TagIcon icon={icon} size={12} style={{ color: active ? "#fff" : color }} />
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
          {onDelete && (
            <button onClick={onDelete} className="px-4 py-2.5 rounded-xl border border-red-200 text-sm text-red-500 hover:bg-red-50 font-medium transition-colors">
              {t("delete")}
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-medium">
            {t("cancel")}
          </button>
          <button onClick={save} disabled={!name.trim()}
            className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-40">
            {saveLabel ?? t("save")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── TagEditorList — lista CRUD dei tag (riusabile inline o dentro una modale) ──

export function TagEditorList({ tagDefs, onAdd, onRename, onColor, onIcon, onDelete }: {
  tagDefs: TagDef[];
  onAdd: (name: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onColor: (name: string, color: string) => void;
  onIcon: (name: string, icon: string) => void;
  onDelete: (name: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const t = useT();
  const add = () => { if (newName.trim()) { onAdd(newName); setNewName(""); } };
  return (
    <div className="space-y-3">
      {tagDefs.length === 0 && <p className="text-xs text-gray-400">{t("noTagsAdd")}</p>}
      <div className="max-h-72 overflow-y-auto pr-0.5 divide-y divide-gray-100">
        {tagDefs.map(td => (
          <div key={td.name} className="py-3 first:pt-0 space-y-2">
            {/* Nome + preview + elimina */}
            <div className="flex items-center gap-2">
              <TagBadge icon={td.icon} color={td.color} box={26} glyph={15} />
              <input defaultValue={td.name} key={td.name + td.color}
                onBlur={e => { const v = e.target.value.trim(); if (v && v !== td.name) onRename(td.name, v); }}
                onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <button onClick={() => onDelete(td.name)} title={t("deleteTag")}
                className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
            {/* Colori */}
            <div className="flex items-center gap-1 flex-wrap">
              {TAG_PALETTE.map(c => (
                <button key={c} onClick={() => onColor(td.name, c)} title={t("color")}
                  className="w-5 h-5 rounded-full border-2 box-border transition-opacity hover:opacity-70"
                  style={{ backgroundColor: c, borderColor: td.color === c ? "#111827" : "transparent" }} />
              ))}
            </div>
            {/* Icone (obbligatoria: sempre icona + colore) */}
            <div className="flex items-center gap-1 flex-wrap">
              {TAG_ICON_KEYS.map(key => (
                <button key={key} onClick={() => onIcon(td.name, key)} title={t("tagIcon")}
                  className={["rounded-lg flex items-center justify-center border p-0.5 transition-colors",
                    td.icon === key ? "border-gray-800" : "border-transparent hover:border-gray-200"].join(" ")}>
                  <TagBadge icon={key} color={td.color} box={22} glyph={13} />
                </button>
              ))}
            </div>
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

export function ManageTagsModal({ tagDefs, onAdd, onRename, onColor, onIcon, onDelete, onClose }: {
  tagDefs: TagDef[];
  onAdd: (name: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onColor: (name: string, color: string) => void;
  onIcon: (name: string, icon: string) => void;
  onDelete: (name: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <Modal title={t("manageTags")} onClose={onClose}>
      <TagEditorList tagDefs={tagDefs} onAdd={onAdd} onRename={onRename} onColor={onColor} onIcon={onIcon} onDelete={onDelete} />
    </Modal>
  );
}
