import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Calculator,
  FlaskConical,
  Leaf,
  Shield,
  Shuffle,
} from "lucide-react";

export interface NavItem {
  id:
    | "library"
    | "interactions"
    | "track"
    | "analytics"
    | "dxm"
    | "kratom"
    | "safety";
  href: string;
  label: string;
  icon: LucideIcon;
  section: "explore" | "track" | "tools";
  /**
   * DaisyUI semantic color token used for the item's icon. Inactive items
   * render the icon at ~70% opacity in this color; active items render at
   * full opacity. This gives each section a stable theme-aware accent so
   * the sidebar reads as more colorful instead of monochrome neutral.
   */
  color:
    | "primary"
    | "secondary"
    | "accent"
    | "info"
    | "success"
    | "warning"
    | "error";
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "library",
    href: "/",
    label: "Library",
    icon: FlaskConical,
    section: "explore",
    color: "primary",
  },
  {
    id: "interactions",
    href: "/interactions",
    label: "Interactions",
    icon: Shuffle,
    section: "explore",
    color: "secondary",
  },
  {
    id: "track",
    href: "/dose-log",
    label: "Track",
    icon: Activity,
    section: "track",
    color: "accent",
  },
  {
    id: "analytics",
    href: "/analytics",
    label: "Analytics",
    icon: BarChart3,
    section: "tools",
    color: "info",
  },
  {
    id: "dxm",
    href: "/dxm-calculator",
    label: "DXM Calculator",
    icon: Calculator,
    section: "tools",
    color: "warning",
  },
  {
    id: "kratom",
    href: "/kratom-calculator",
    label: "Kratom Calculator",
    icon: Leaf,
    section: "tools",
    color: "success",
  },
  {
    id: "safety",
    href: "/harm-reduction",
    label: "Safety",
    icon: Shield,
    section: "explore",
    color: "error",
  },
];

export const NAV_SECTIONS: Array<{
  title: string;
  section: NavItem["section"];
}> = [
  { title: "Explore", section: "explore" },
  { title: "Track", section: "track" },
  { title: "Tools", section: "tools" },
];

export function isNavItemActive(item: NavItem, pathname: string) {
  // Normalize trailing slash: with `trailingSlash: true` in next.config.ts,
  // `/dose-log` becomes `/dose-log/`. Strip it so comparisons work either way.
  const p = pathname.replace(/\/$/, "") || "/";
  switch (item.id) {
    case "library":
      // Library is active on bare `/` (no trailing path, no view param).
      return p === "/";
    case "track":
      return p.startsWith("/dose-log");
    case "interactions":
      return p.startsWith("/interactions");
    case "analytics":
      return p.startsWith("/analytics");
    case "dxm":
      return p.startsWith("/dxm-calculator");
    case "kratom":
      return p.startsWith("/kratom-calculator");
    case "safety":
      return p.startsWith("/harm-reduction");
    default:
      return false;
  }
}

export function getPageTitle(pathname: string) {
  // Normalize trailing slash (see isNavItemActive for rationale).
  const p = pathname.replace(/\/$/, "") || "/";
  switch (p) {
    case "/":
      return "Library";
    case "/interactions":
      return "Interactions";
    case "/dose-log":
      return "Track";
    case "/analytics":
      return "Analytics";
    case "/dxm-calculator":
      return "DXM Calculator";
    case "/kratom-calculator":
      return "Kratom Calculator";
    case "/harm-reduction":
      return "Safety";
    default:
      return "Drugucopia";
  }
}
