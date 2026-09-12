import type { SamsProjectionMatchInput } from "@/lib/db/schemas";

/** Group schedule matches by each participating team UUID (team1 and team2). */
export function groupProjectionMatchesByTeamUuid(
  matches: readonly SamsProjectionMatchInput[],
): Map<string, SamsProjectionMatchInput[]> {
  const byTeamUuid = new Map<string, SamsProjectionMatchInput[]>();

  for (const match of matches) {
    for (const team of [match._embedded?.team1, match._embedded?.team2]) {
      if (!team?.uuid) continue;
      const teamMatches = byTeamUuid.get(team.uuid) ?? [];
      teamMatches.push(match);
      byTeamUuid.set(team.uuid, teamMatches);
    }
  }

  return byTeamUuid;
}
