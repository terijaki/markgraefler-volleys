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
    name: "Markgräfler Volleys 1",
    slug: "markgraefler-volleys-1",
    leagueUuid: "league-mv-landesliga",
    leagueName: "Landesliga",
    leagueHierarchyLevel: 3,
  },
  {
    uuid: "team-mv-2",
    name: "Markgräfler Volleys 2",
    slug: "markgraefler-volleys-2",
    leagueUuid: "league-mv-verbandsliga",
    leagueName: "Verbandsliga",
    leagueHierarchyLevel: 4,
  },
  {
    uuid: "team-mv-3",
    name: "Markgräfler Volleys 3",
    slug: "markgraefler-volleys-3",
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
  },
  { uuid: "club-opp-rhein-vc", name: "Rhein VC", slug: "rhein-vc", picsumSeed: "opp-rhein-vc" },
  {
    uuid: "club-opp-kaiserstuhl-vv",
    name: "Kaiserstuhl VV",
    slug: "kaiserstuhl-vv",
    picsumSeed: "opp-kaiserstuhl-vv",
  },
  {
    uuid: "club-opp-breisgau-vc",
    name: "Breisgau VC",
    slug: "breisgau-vc",
    picsumSeed: "opp-breisgau-vc",
  },
  {
    uuid: "club-opp-titisee-tv",
    name: "Titisee TV",
    slug: "titisee-tv",
    picsumSeed: "opp-titisee-tv",
  },
  {
    uuid: "club-opp-staufen-tv",
    name: "Staufen TV",
    slug: "staufen-tv",
    picsumSeed: "opp-staufen-tv",
  },
  {
    uuid: "club-opp-muellheim-vc",
    name: "Müllheim VC",
    slug: "muellheim-vc",
    picsumSeed: "opp-muellheim-vc",
  },
  {
    uuid: "club-opp-loerrach-vv",
    name: "Lörrach VV",
    slug: "loerrach-vv",
    picsumSeed: "opp-loerrach-vv",
  },
] as const;

export function opponentTeamUuid(leagueUuid: string, opponentIndex: number): string {
  return `team-opp-${leagueUuid}-${opponentIndex}`;
}

export function matchUuid(teamUuid: string, phase: "past" | "future", index: number): string {
  return `match-${teamUuid}-${phase}-${index}`;
}

export function playerUuid(teamUuid: string, index: number): string {
  return `player-${teamUuid}-${index}`;
}
