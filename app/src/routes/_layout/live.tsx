import { createFileRoute } from "@tanstack/react-router";
import { Radio } from "lucide-react";
import HomeLiveTicker from "@webapp/components/homepage/HomeLiveTicker";
import PageWithHeading from "@webapp/components/layout/PageWithHeading";
import { useHomeLiveTickerData } from "@webapp/hooks/useHomeLiveTicker";

export const Route = createFileRoute("/_layout/live")({
  component: RouteComponent,
});

function RouteComponent() {
  const { ourMatches, hasOpenMatches } = useHomeLiveTickerData();

  return (
    <PageWithHeading
      title="Live"
      subtitle={hasOpenMatches ? "Aktuelle Ergebnisse unserer Teams" : "Ergebnisse unserer Teams"}
      icon={Radio}
    >
      <HomeLiveTicker matches={ourMatches} />
    </PageWithHeading>
  );
}
