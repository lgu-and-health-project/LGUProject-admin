import {
  Users,
  UserCog,
  Building2,
  Landmark,
  Briefcase,
  HeartPulse,
  ShieldAlert,
  FileText,
  Calculator,
  HandHeart,
  Sprout,
  Map,
  Box,
  Shield,
  TrendingUp,
  HardHat,
  Leaf,
  Gavel,
  LayoutDashboard,
  Megaphone,
  Server,
  LucideIcon,
} from "lucide-react";

// Keyed by module id from lib/config/modules.ts. A module with no entry here
// falls back to Box in the sidebar rather than crashing the render.
export const MODULE_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  "my-hr": Briefcase,
  announcements: Megaphone,
  
  profile: Building2,
  staff: Users,
  roles: Shield,
  miso: Server,

  financial: Landmark,
  assessment: Calculator,
  planning: Map,
  engineering: HardHat,
  health: HeartPulse,
  registry: FileText,
  legislative: Gavel,
  hr: Briefcase,
  welfare: HandHeart,
  "general-services": Box,
  agriculture: Sprout,
  environment: Leaf,
  disaster: ShieldAlert,
  "peace-safety": Shield,
  "economic-dev": TrendingUp,
};

export function getModuleIcon(moduleId: string): LucideIcon {
  return MODULE_ICONS[moduleId] ?? Box;
}
