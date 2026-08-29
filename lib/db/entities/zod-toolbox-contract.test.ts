import { describe, it } from "vite-plus/test";
import {
  locationSchema,
  mediaSchema,
  memberSchema,
  samsClubSchema,
  samsRosterSchema,
  samsTeamSchema,
  sponsorSchema,
  teamSchema,
} from "../schemas";
import {
  LocationEntity,
  MediaEntity,
  MemberEntity,
  SamsClubEntity,
  SamsRosterEntity,
  SamsTeamEntity,
  SponsorEntity,
  TeamEntity,
} from "./index";
import { assertKeyEncoding, assertZodToolboxContract } from "./__tests__/zod-toolbox-contract";
import {
  locationPk,
  mediaPk,
  memberPk,
  samsClubPk,
  samsRosterPk,
  samsTeamPk,
  SK_METADATA,
  sponsorPk,
  teamPk,
} from "../key-constants";

const TEAM_ID = "550e8400-e29b-41d4-a716-446655440000";
const MEMBER_ID = "660e8400-e29b-41d4-a716-446655440001";
const SPONSOR_ID = "770e8400-e29b-41d4-a716-446655440002";
const LOCATION_ID = "880e8400-e29b-41d4-a716-446655440003";
const MEDIA_ID = "990e8400-e29b-41d4-a716-446655440004";
const CLUB_UUID = "aa0e8400-e29b-41d4-a716-446655440005";
const SAMS_TEAM_UUID = "bb0e8400-e29b-41d4-a716-446655440006";
const LOCATION_REF = "cc0e8400-e29b-41d4-a716-446655440007";

const iso = "2024-06-15T10:30:00.000Z";

describe("Zod ↔ Toolbox contract suite", () => {
  it("Team entity", () => {
    const minimal = {
      id: TEAM_ID,
      type: "team" as const,
      name: "Herren 1",
      slug: "herren-1",
      gender: "male" as const,
      createdAt: iso,
      updatedAt: iso,
    };
    const maximal = {
      ...minimal,
      description: "Desc",
      sbvvTeamId: "sbvv-1",
      ageGroup: "senior",
      league: "Bezirksliga",
      trainerIds: [MEMBER_ID],
      pointOfContactIds: [MEMBER_ID],
      pictureS3Keys: ["pic.jpg"],
      trainingSchedules: [
        { days: [1, 3], startTime: "19:00", endTime: "21:00", locationId: LOCATION_REF },
      ],
    };
    assertZodToolboxContract({
      entityName: "Team",
      zodSchema: teamSchema,
      entity: TeamEntity,
      minimalFixture: minimal,
      maximalFixture: maximal,
      keyFields: ["id", "type", "slug"],
      keyIsolationVariant: { ...maximal, name: "Different Name", description: "Other" },
    });
    assertKeyEncoding(TeamEntity, maximal, {
      pk: teamPk(TEAM_ID),
      sk: SK_METADATA,
      _et: "Team",
      gsi1pk: "team",
      gsi1sk: "herren-1",
      gsi3pk: "herren-1",
      gsi3sk: SK_METADATA,
    });
  });

  it("Member entity", () => {
    const minimal = {
      id: MEMBER_ID,
      type: "member" as const,
      name: "Alex Example",
      createdAt: iso,
      updatedAt: iso,
    };
    const maximal = {
      ...minimal,
      privateEmail: "private@example.com",
      proxyEmail: "alias@example.com",
      phone: "+491234",
      isTrainer: true,
      roleTitle: "Coach",
      avatarS3Key: "avatar.jpg",
      authRole: "Admin" as const,
    };
    assertZodToolboxContract({
      entityName: "Member",
      zodSchema: memberSchema,
      entity: MemberEntity,
      minimalFixture: minimal,
      maximalFixture: maximal,
      keyFields: ["id", "type", "updatedAt", "privateEmail", "proxyEmail"],
      keyIsolationVariant: { ...maximal, name: "Other Name", phone: "999" },
    });
    assertKeyEncoding(MemberEntity, maximal, {
      pk: memberPk(MEMBER_ID),
      sk: SK_METADATA,
      _et: "Member",
      gsi1pk: "member",
      gsi1sk: iso,
    });
  });

  it("Sponsor entity", () => {
    const minimal = {
      id: SPONSOR_ID,
      type: "sponsor" as const,
      name: "Acme GmbH",
      createdAt: iso,
      updatedAt: iso,
    };
    const maximal = {
      ...minimal,
      description: "Great sponsor",
      websiteUrl: "https://example.com",
      logoS3Key: "logo.png",
      ttl: 1_700_000_000,
    };
    assertZodToolboxContract({
      entityName: "Sponsor",
      zodSchema: sponsorSchema,
      entity: SponsorEntity,
      minimalFixture: minimal,
      maximalFixture: maximal,
      keyFields: ["id", "type", "updatedAt"],
      keyIsolationVariant: { ...maximal, name: "Other Sponsor" },
    });
    assertKeyEncoding(SponsorEntity, maximal, {
      pk: sponsorPk(SPONSOR_ID),
      sk: SK_METADATA,
      _et: "Sponsor",
      gsi1pk: "sponsor",
      gsi1sk: iso,
    });
  });

  it("Location entity", () => {
    const minimal = {
      id: LOCATION_ID,
      type: "location" as const,
      name: "Halle 1",
      street: "Sportstr. 1",
      postal: "79423",
      city: "Heitersheim",
      createdAt: iso,
      updatedAt: iso,
    };
    const maximal = { ...minimal, description: "Main hall" };
    assertZodToolboxContract({
      entityName: "Location",
      zodSchema: locationSchema,
      entity: LocationEntity,
      minimalFixture: minimal,
      maximalFixture: maximal,
      keyFields: ["id", "type", "updatedAt"],
      keyIsolationVariant: { ...maximal, name: "Halle 2" },
    });
    assertKeyEncoding(LocationEntity, maximal, {
      pk: locationPk(LOCATION_ID),
      sk: SK_METADATA,
      _et: "Location",
      gsi1pk: "location",
      gsi1sk: iso,
    });
  });

  it("Media entity", () => {
    const minimal = {
      id: MEDIA_ID,
      filename: "photo.jpg",
      mimeType: "image/jpeg",
      url: "https://cdn.example.com/photo.jpg",
      s3Key: "media/photo.jpg",
      s3Bucket: "bucket",
      fileSize: 1024,
      uploadedBy: MEMBER_ID,
      createdAt: iso,
      updatedAt: iso,
    };
    const maximal = { ...minimal, alt: "Alt", caption: "Cap", width: 800, height: 600 };
    assertZodToolboxContract({
      entityName: "Media",
      zodSchema: mediaSchema,
      entity: MediaEntity,
      minimalFixture: minimal,
      maximalFixture: maximal,
      keyFields: ["id"],
      keyIsolationVariant: { ...maximal, filename: "other.jpg" },
    });
    assertKeyEncoding(MediaEntity, maximal, {
      pk: mediaPk(MEDIA_ID),
      sk: SK_METADATA,
      _et: "Media",
    });
  });

  it("SamsClub entity", () => {
    const minimal = {
      sportsclubUuid: CLUB_UUID,
      type: "club" as const,
      name: "Markgräfler Volleys",
      nameSlug: "markgraefler-volleys",
      updatedAt: iso,
      ttl: 1_700_000_000,
    };
    const maximal = {
      ...minimal,
      associationUuid: "assoc-1",
      associationName: "SBVV",
      logoImageLink: "https://logo.example.com/x.png",
      logoS3Key: "sams-logos/x.png",
      snapshotVersion: "snap-1",
    };
    assertZodToolboxContract({
      entityName: "SamsClub",
      zodSchema: samsClubSchema,
      entity: SamsClubEntity,
      minimalFixture: minimal,
      maximalFixture: maximal,
      keyFields: ["sportsclubUuid", "type", "nameSlug"],
      keyIsolationVariant: { ...maximal, name: "Other Club" },
    });
    assertKeyEncoding(SamsClubEntity, maximal, {
      pk: samsClubPk(CLUB_UUID),
      sk: SK_METADATA,
      _et: "SamsClub",
      gsi1pk: "club",
      gsi1sk: "markgraefler-volleys",
    });
  });

  it("SamsTeam entity", () => {
    const minimal = {
      uuid: SAMS_TEAM_UUID,
      type: "team" as const,
      name: "MV Herren",
      nameSlug: "mv-herren",
      sportsclubUuid: CLUB_UUID,
      associationUuid: "assoc-1",
      leagueUuid: "league-1",
      leagueName: "Bezirksliga",
      seasonUuid: "season-1",
      seasonName: "2024/25",
      updatedAt: iso,
      ttl: 1_700_000_000,
    };
    const maximal = { ...minimal, leagueHierarchyLevel: 2, snapshotVersion: "snap-1" };
    assertZodToolboxContract({
      entityName: "SamsTeam",
      zodSchema: samsTeamSchema,
      entity: SamsTeamEntity,
      minimalFixture: minimal,
      maximalFixture: maximal,
      keyFields: ["uuid", "type", "nameSlug"],
      keyIsolationVariant: { ...maximal, name: "MV Damen" },
    });
    assertKeyEncoding(SamsTeamEntity, maximal, {
      pk: samsTeamPk(SAMS_TEAM_UUID),
      sk: SK_METADATA,
      _et: "SamsTeam",
      gsi1pk: "team",
      gsi1sk: "mv-herren",
    });
  });

  it("SamsRoster entity", () => {
    const minimal = {
      teamUuid: SAMS_TEAM_UUID,
      type: "roster" as const,
      players: [],
      officials: [],
      updatedAt: iso,
      ttl: 1_700_000_000,
    };
    const maximal = {
      ...minimal,
      players: [
        {
          uuid: "p1",
          name: "Jane Doe",
          jerseyNumber: 7,
          position: "Zuspiel",
          portraitImageLink: "https://example.com/p.png",
        },
      ],
      officials: [{ uuid: "o1", name: "Coach Smith", role: "Trainer" }],
      snapshotVersion: "snap-1",
    };
    assertZodToolboxContract({
      entityName: "SamsRoster",
      zodSchema: samsRosterSchema,
      entity: SamsRosterEntity,
      minimalFixture: minimal,
      maximalFixture: maximal,
      keyFields: ["teamUuid", "type"],
      keyIsolationVariant: {
        ...maximal,
        players: [{ uuid: "p2", name: "Other Player" }],
      },
    });
    assertKeyEncoding(SamsRosterEntity, maximal, {
      pk: samsRosterPk(SAMS_TEAM_UUID),
      sk: SK_METADATA,
      _et: "SamsRoster",
      gsi1pk: "roster",
      gsi1sk: SAMS_TEAM_UUID,
    });
  });
});
