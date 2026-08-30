import { buildTestSamsProviderFixtures } from "./build-seed-fixtures";
export {
  buildSamsProviderSeedFixtures,
  buildTestSamsProviderFixtures,
  hashVariationSeed,
  resolveMvTeamCount,
  TEST_VARIATION_SEED,
  type BuildSamsProviderSeedFixturesOptions,
  type SamsProviderFixture,
} from "./build-seed-fixtures";
export { buildMockSamsProviderSqsBody } from "./sqs-body";
export {
  matchUuid,
  opponentTeamUuid,
  playerUuid,
  SEED_MV_CLUB,
  SEED_MV_TEAMS,
  SEED_OPPONENT_CLUBS,
  SEED_SEASON,
} from "./ids";
export { picsumImageUrl } from "./picsum";

/** Stable fixtures for processor unit tests. */
export const samsProviderEventFixtures = buildTestSamsProviderFixtures();
