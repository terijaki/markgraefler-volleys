import { LocationEntity } from "./content/location";
import { MediaEntity } from "./content/media";
import { MemberEntity } from "./content/member";
import { SponsorEntity } from "./content/sponsor";
import { TeamEntity } from "./content/team";
import { SamsClubEntity } from "./sams/club";
import { SamsRosterEntity } from "./sams/roster";
import { SamsTeamEntity } from "./sams/team";
import { SamsTeamLogoEntity } from "./sams/team-logo";

export { LocationEntity, MediaEntity, MemberEntity, SponsorEntity, TeamEntity };
export { SamsClubEntity, SamsRosterEntity, SamsTeamEntity, SamsTeamLogoEntity };

export const ContentEntities = {
  team: TeamEntity,
  member: MemberEntity,
  media: MediaEntity,
  sponsor: SponsorEntity,
  location: LocationEntity,
} as const;

export const SamsEntities = {
  club: SamsClubEntity,
  team: SamsTeamEntity,
  teamLogo: SamsTeamLogoEntity,
  roster: SamsRosterEntity,
} as const;

export type ContentEntityName = keyof typeof ContentEntities;
export type SamsEntityName = keyof typeof SamsEntities;
