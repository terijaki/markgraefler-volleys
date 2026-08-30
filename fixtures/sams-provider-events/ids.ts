/** Stable SAMS entity ids used across seed runs (reseed updates in place). */

export const SEED_SEASON = {
  uuid: "season-mv-2026-27",
  name: "2026/27",
} as const;

export const SEED_MV_CLUB = {
  uuid: "club-markgraefler-volleys",
  name: "Markgräfler Volleys",
  slug: "markgraefler-volleys",
  associationUuid: "assoc-sbvv",
  associationName: "Südbadischer Volleyball-Verband",
  picsumSeed: "club-markgraefler-volleys",
} as const;

export const SEED_MV_TEAMS = [
  {
    uuid: "team-mv-1",
    name: "Markgräfler Volleys 1. Herren",
    slug: "markgraefler-volleys-1-herren",
    leagueUuid: "league-mv-landesliga",
    leagueName: "Landesliga",
    leagueHierarchyLevel: 3,
  },
  {
    uuid: "team-mv-2",
    name: "MV II (Verbandsliga)",
    slug: "mv-ii-verbandsliga",
    leagueUuid: "league-mv-verbandsliga",
    leagueName: "Verbandsliga",
    leagueHierarchyLevel: 4,
  },
  {
    uuid: "team-mv-3",
    name: "Markgräfler Mix",
    slug: "markgraefler-mix",
    leagueUuid: "league-mv-bezirksliga",
    leagueName: "Bezirksliga",
    leagueHierarchyLevel: 5,
  },
] as const;

export const SEED_OPPONENT_CLUBS = [
  {
    uuid: "club-opp-schwarzwald-vc",
    name: "Schwarzwald VC",
    slug: "schwarzwald-vc",
    picsumSeed: "opp-schwarzwald-vc",
    teamLabels: ["1", "Damen", "U20"],
  },
  {
    uuid: "club-opp-rhein-vc",
    name: "VfL Rheinfelden",
    slug: "rhein-vc",
    picsumSeed: "opp-rhein-vc",
    teamLabels: ["1", "2"],
  },
  {
    uuid: "club-opp-kaiserstuhl-vv",
    name: "Kaiserstuhl VV",
    slug: "kaiserstuhl-vv",
    picsumSeed: "opp-kaiserstuhl-vv",
    teamLabels: ["Herren", "Damen"],
  },
  {
    uuid: "club-opp-breisgau-vc",
    name: "Breisgau Volleys",
    slug: "breisgau-vc",
    picsumSeed: "opp-breisgau-vc",
    teamLabels: ["1", "U18"],
  },
  {
    uuid: "club-opp-titisee-tv",
    name: "Titisee-Neustadt TV",
    slug: "titisee-tv",
    picsumSeed: "opp-titisee-tv",
    teamLabels: ["1", "2", "Mix"],
  },
  {
    uuid: "club-opp-staufen-tv",
    name: "TV Staufen",
    slug: "staufen-tv",
    picsumSeed: "opp-staufen-tv",
    teamLabels: ["1", "Damen"],
  },
  {
    uuid: "club-opp-muellheim-vc",
    name: "VC Müllheim",
    slug: "muellheim-vc",
    picsumSeed: "opp-muellheim-vc",
    teamLabels: ["1", "2"],
  },
  {
    uuid: "club-opp-loerrach-vv",
    name: "Lörrach VV",
    slug: "loerrach-vv",
    picsumSeed: "opp-loerrach-vv",
    teamLabels: ["1", "U20"],
  },
  {
    uuid: "club-opp-emmendingen-tv",
    name: "TSV Emmendingen",
    slug: "emmendingen-tv",
    picsumSeed: "opp-emmendingen-tv",
    teamLabels: ["1", "Damen"],
  },
] as const;

export function opponentTeamDisplayName(
  club: (typeof SEED_OPPONENT_CLUBS)[number],
  opponentIndex: number,
): string {
  const label = club.teamLabels[opponentIndex % club.teamLabels.length];
  if (label === "1" || label === "2") {
    return `${club.name} ${label}`;
  }
  return `${club.name} ${label}`;
}

export function opponentTeamUuid(leagueUuid: string, opponentIndex: number): string {
  return `team-opp-${leagueUuid}-${opponentIndex}`;
}

export function matchUuid(teamUuid: string, phase: "past" | "future", index: number): string {
  return `match-${teamUuid}-${phase}-${index}`;
}

export function playerUuid(teamUuid: string, index: number): string {
  return `player-${teamUuid}-${index}`;
}
