import { CalendarDays, List, Radio, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavbarLink {
  name: string;
  href: "/live" | "/teams" | "/tabelle" | "/matches";
  icon: LucideIcon;
}

export const liveNavbarLink = {
  name: "Live",
  href: "/live",
  icon: Radio,
} as const satisfies NavbarLink;

export const navbarLinks = [
  { name: "Teams", href: "/teams", icon: Users },
  { name: "Tabellen", href: "/tabelle", icon: List },
  { name: "Spielplan", href: "/matches", icon: CalendarDays },
] satisfies NavbarLink[];
