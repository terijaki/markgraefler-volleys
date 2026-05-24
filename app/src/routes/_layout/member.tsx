import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import PageWithHeading from "@webapp/components/layout/PageWithHeading";
import MembersDirectory from "@webapp/components/members/MembersDirectory";

export const Route = createFileRoute("/_layout/member")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <PageWithHeading
      title="Funktionäre der Spielgemeinschaft"
      subtitle="Ansprechpartner:innen des TV Staufen und VC Müllheim"
      icon={Users}
    >
      <MembersDirectory />
    </PageWithHeading>
  );
}
