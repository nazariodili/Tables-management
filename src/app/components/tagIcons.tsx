import {
  Star, Heart, Crown, Gift, Flame, Bell, Bookmark, Flag, Award, Gem,
  Shield, Sun, Moon, Hexagon, Droplet, Circle, Sparkles, Diamond, LucideProps,
} from "lucide-react";

// Icone selezionabili per i tag (chiave stringa → componente lucide).
// Scelte tra quelle che rese "piene" restano leggibili anche a dimensioni piccole.
export const TAG_ICONS: Record<string, React.ComponentType<LucideProps>> = {
  star: Star, heart: Heart, crown: Crown, gift: Gift, flame: Flame, bell: Bell,
  bookmark: Bookmark, flag: Flag, award: Award, gem: Gem, shield: Shield,
  sun: Sun, moon: Moon, hexagon: Hexagon, droplet: Droplet, circle: Circle,
  sparkles: Sparkles, diamond: Diamond,
};

export const TAG_ICON_KEYS = Object.keys(TAG_ICONS);

// Renderizza l'icona di un tag PIENA (fill), niente se la chiave è assente/non valida.
export function TagIcon({ icon, size = 12, className, style }: {
  icon?: string; size?: number; className?: string; style?: React.CSSProperties;
}) {
  const Cmp = icon ? TAG_ICONS[icon] : undefined;
  if (!Cmp) return null;
  return <Cmp size={size} className={className} style={style} fill="currentColor" strokeWidth={1.25} />;
}
