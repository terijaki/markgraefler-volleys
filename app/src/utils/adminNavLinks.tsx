import { BadgeEuro, Building2, Contact, MapPinned, Users } from "lucide-react";
import type { ReactElement } from "react";

type AdminRoute = {
  to: string;
  label: string;
  icon: ReactElement;
  description: string;
};

export function getAdminRoutesWithLabels(): AdminRoute[] {
  const routes: AdminRoute[] = [
    {
      to: "/admin/teams",
      label: "Mannschaften",
      icon: <Users />,
      description: "Informationen zu den Mannschaften, wie Trainingszeiten, Trainer, Alter, Fotos.",
    },
    {
      to: "/admin/members",
      label: "Mitglieder",
      icon: <Contact />,
      description: "Verwalte die Mitglieder die Auf der Startseite angezeigt werden.",
    },
    {
      to: "/admin/locations",
      label: "Orte",
      icon: <MapPinned />,
      description: "Feste Orte wie unsere Sporthallen.",
    },
    {
      to: "/admin/sponsors",
      label: "Sponsoren",
      icon: <BadgeEuro />,
      description: "Stelle Sponsoren ein mit Logo, Beschreibung und Link.",
    },
    {
      to: "/admin/sams",
      label: "SAMS",
      icon: <Building2 />,
      description: "SAMS Teams Übersicht.",
    },
  ];

  return routes;
}
