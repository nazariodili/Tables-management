import {
  Star, Heart, Crown, Flame, Bell, Bookmark, Flag, Award, Gem,
  Shield, Sun, Moon, Hexagon, Droplet, Circle, Sparkles, Diamond, LucideProps,
} from "lucide-react";

// Icone selezionabili per i tag (chiave stringa → componente lucide).
// Scelte tra quelle che rese "piene" restano leggibili anche a dimensioni piccole.
export const TAG_ICONS: Record<string, React.ComponentType<LucideProps>> = {
  star: Star, heart: Heart, crown: Crown, flame: Flame, bell: Bell,
  bookmark: Bookmark, flag: Flag, award: Award, gem: Gem, shield: Shield,
  sun: Sun, moon: Moon, hexagon: Hexagon, droplet: Droplet, circle: Circle,
  sparkles: Sparkles, diamond: Diamond,
};

export const TAG_ICON_KEYS = Object.keys(TAG_ICONS);
// Ogni tag ha SEMPRE un'icona: se manca/non valida si usa questa di default.
export const DEFAULT_TAG_ICON = "circle";

// Renderizza l'icona di un tag PIENA (fill). Fallback all'icona di default.
export function TagIcon({ icon, size = 12, className, style }: {
  icon?: string; size?: number; className?: string; style?: React.CSSProperties;
}) {
  const Cmp = (icon && TAG_ICONS[icon]) || TAG_ICONS[DEFAULT_TAG_ICON];
  return <Cmp size={size} className={className} style={style} fill="currentColor" strokeWidth={1.25} />;
}

// Badge del tag: box tondeggiante con sfondo tinta del colore + icona piena.
export function TagBadge({ icon, color, box = 18, glyph = 11, className }: {
  icon?: string; color: string; box?: number; glyph?: number; className?: string;
}) {
  return (
    <span className={className}
      style={{ width: box, height: box, borderRadius: Math.round(box * 0.3), backgroundColor: color + "2e", color, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <TagIcon icon={icon} size={glyph} />
    </span>
  );
}
