import { getOwnedSamsTeamUuids } from "@/utils/sams";
import { toLiveTickerDisplayMatches } from "../utils/liveTicker";
import { useLiveTicker, useSamsTeams } from "./dataQueries";

export function useHomeLiveTickerData() {
  const { data: tickerData } = useLiveTicker();
  const { data: samsTeamsData } = useSamsTeams();
  const liveMatches = tickerData?.liveMatches ?? [];
  const teams = samsTeamsData?.teams ?? [];

  const ourTeamUuids = getOwnedSamsTeamUuids(teams);

  const ourMatches = toLiveTickerDisplayMatches({ liveMatches, ourTeamUuids });
  const hasMatchesToday = ourMatches.length > 0;
  const hasOpenMatches = ourMatches.some((match) => !match.isFinished);

  return {
    ourMatches,
    hasMatchesToday,
    hasOpenMatches,
  };
}
