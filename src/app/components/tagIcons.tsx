import {
  Star, Heart, Crown, Gift, Cake, Wine, Utensils, Baby, Music, Users,
  Briefcase, Plane, Sparkles, Leaf, Accessibility, Flower2, Glasses, LucideProps,
} from "lucide-react";

// Icone selezionabili per i tag (chiave stringa → componente lucide).
export const TAG_ICONS: Record<string, React.ComponentType<LucideProps>> = {
  star: Star, heart: Heart, crown: Crown, gift: Gift, cake: Cake, wine: Wine,
  utensils: Utensils, baby: Baby, music: Music, users: Users, briefcase: Briefcase,
  plane: Plane, sparkles: Sparkles, leaf: Leaf, accessibility: Accessibility,
  flower: Flower2, glasses: Glasses,
};

export const TAG_ICON_KEYS = Object.keys(TAG_ICONS);

// Renderizza l'icona di un tag (niente se la chiave non è valida/assente).
export function TagIcon({ icon, size = 12, className, style }: {
  icon?: string; size?: number; className?: string; style?: React.CSSProperties;
}) {
  const Cmp = icon ? TAG_ICONS[icon] : undefined;
  if (!Cmp) return null;
  return <Cmp size={size} className={className} style={style} />;
}
