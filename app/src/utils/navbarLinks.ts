import { CalendarDays, List, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavbarLink {
  name: string;
  href: "/teams" | "/tabelle" | "/matches";
  icon: LucideIcon;
}

export const navbarLinks = [
  { name: "Teams", href: "/teams", icon: Users },
  { name: "Tabellen", href: "/tabelle", icon: List },
  { name: "Spielplan", href: "/matches", icon: CalendarDays },
] satisfies NavbarLink[];
