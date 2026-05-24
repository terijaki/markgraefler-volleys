#!/usr/bin/env bun

/**
 * Database seeding script for development/staging environments
 * Creates fake German data for DynamoDB tables with cross-references between members and teams
 *
 * Usage:
 *   bun run db:seed                    # Seeds all entities
 *   bun run db:seed --cleanup          # Cleanup only (validates prod protection)
 *   bun run db:seed --cleanup --members  # Cleanup + seed members
 *   bun run db:seed --members          # Seeds only members
 *   bun run db:seed --teams            # Seeds only teams
 *   bun run db:seed --locations        # Seeds only locations
 *   bun run db:seed --sponsors         # Seeds only sponsors
 *   bun run db:seed --user email@example.com  # Grant Admin role to a member (creates minimal member if not found)
 */

import "varlock/auto-load";
import { execSync } from "node:child_process";
import https from "node:https";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  ScanCommand as ScanDocCommand,
} from "@aws-sdk/lib-dynamodb";
import dayjs from "dayjs";
import { createDb } from "@/lib/db/electrodb-client";
import {
  type LocationInput,
  locationSchema,
  type MemberInput,
  memberSchema,
  sponsorSchema,
  type TeamInput,
  teamSchema,
} from "@/lib/db/schemas";
import { Club } from "@/project.config";
import { getSanitizedBranch } from "@/utils/git";
import { slugify } from "@/utils/slugify";

// Check environment
const CDK_ENVIRONMENT = process.env.CDK_ENVIRONMENT || "dev";
if (CDK_ENVIRONMENT === "prod") {
  console.error("❌ Cannot seed production environment!");
  console.error("   Set CDK_ENVIRONMENT to 'dev' to seed.");
  process.exit(1);
}

console.log(`🌱 Seeding database for environment: ${CDK_ENVIRONMENT}`);

// Get git branch for table naming
const sanitizedBranch = getSanitizedBranch();
const branchSuffix = sanitizedBranch ? `-${sanitizedBranch}` : "";

// Check for active AWS session
function checkAwsSession() {
  try {
    execSync("aws sts get-caller-identity", { stdio: "ignore" });
  } catch {
    console.error(
      "❌ No active AWS session found. Please authenticate via AWS SSO before running this script. See docs/SETUP.md for setup instructions.",
    );
    process.exit(1);
  }
}
checkAwsSession();

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "eu-central-1",
});
const docClient = DynamoDBDocumentClient.from(client);

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-central-1",
});

// S3 bucket configuration
const S3_BUCKET = `${Club.slug}-media-${CDK_ENVIRONMENT}${branchSuffix}`;

/**
 * Download image from URL and upload to S3
 */
async function uploadImageToS3(imageUrl: string, s3Key: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(imageUrl, async (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            resolve(await uploadImageToS3(redirectUrl, s3Key));
            return;
          }
        }

        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const chunks: Buffer[] = [];

        response.on("data", (chunk) => {
          chunks.push(chunk);
        });

        response.on("end", async () => {
          try {
            const imageBuffer = Buffer.concat(chunks);

            if (imageBuffer.length === 0) {
              reject(new Error("Downloaded image is empty"));
              return;
            }

            const command = new PutObjectCommand({
              Bucket: S3_BUCKET,
              Key: s3Key,
              Body: imageBuffer,
              ContentType: response.headers["content-type"] || "image/jpeg",
            });

            await s3Client.send(command);
            console.log(
              `  ✓ Uploaded image to s3://${S3_BUCKET}/${s3Key} (${imageBuffer.length} bytes)`,
            );
            resolve(s3Key);
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

// Table name — single content table (mirrors the CDK stack)
const CONTENT_TABLE_NAME = `mv-content-${CDK_ENVIRONMENT}${branchSuffix}`;

// ElectroDB entity map wired to the single content table
const entities = createDb(docClient, CONTENT_TABLE_NAME);

// Parse CLI arguments
const args = process.argv.slice(2);
const cleanupOnly = args.includes("--cleanup") && args.length === 1;
const shouldCleanup = args.includes("--cleanup");

const seedMembers = args.length === 0 || args.includes("--members");
const seedTeams = args.length === 0 || args.includes("--teams");
const seedLocations = args.length === 0 || args.includes("--locations");
const seedSponsors = args.length === 0 || args.includes("--sponsors");

// Handle --user argument (email only — passwordless OTP authentication)
const userArgIndex = args.indexOf("--user");
const shouldCreateUser = userArgIndex !== -1;
let userEmail: string | undefined;

if (shouldCreateUser) {
  const email = args[userArgIndex + 1];
  if (!email || email.startsWith("--")) {
    console.error("❌ Email address required. Use: --user email@example.com");
    process.exit(1);
  }
  userEmail = email;
}

const locationCache: LocationInput[] = [];
const membersCache: MemberInput[] = [];
const teamCache: TeamInput[] = [];

/**
 * Create a CMS user (whitelisted email) in the content table via ElectroDB.
 * The user can then sign in via email OTP (passwordless) at the CMS admin panel.
 */
async function createCmsUser(email: string): Promise<void> {
  console.log(`\n👤 Granting Admin role to member: ${email}...`);

  // Check if a member with this privateEmail already exists
  const existing = await entities.member.query.byPrivateEmail({ privateEmail: email }).go();
  if (existing.data && existing.data.length > 0) {
    const member = existing.data[0];
    if (member.authRole) {
      console.log(`ℹ️  Member ${email} already has authRole: ${member.authRole}`);
      process.exit(0);
    }
    // Grant Admin role to existing member
    await entities.member
      .patch({ id: member.id })
      .set({ authRole: "Admin", updatedAt: new Date().toISOString() })
      .go();
    console.log(`✅ Admin role granted to existing member ${email}`);
    console.log(`   The member can now sign in at the CMS with email OTP (passwordless).`);
    return;
  }

  // No member found — create a minimal one
  await entities.member
    .create({
      id: crypto.randomUUID(),
      name: email.split("@")[0],
      privateEmail: email,
      authRole: "Admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .go();

  console.log(`✅ Member ${email} created with Admin role`);
  console.log(`   The member can now sign in at the CMS with email OTP (passwordless).`);
}

/**
 * Cleanup function - deletes all items from the single content table
 */
async function cleanupDatabase() {
  if (CDK_ENVIRONMENT === "prod") {
    console.error("❌ Cannot cleanup production environment!");
    process.exit(1);
  }

  console.log("\n🧹 Cleaning up database...");

  try {
    let scannedItems = 0;
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    while (true) {
      const result = await docClient.send(
        new ScanDocCommand({
          TableName: CONTENT_TABLE_NAME,
          ExclusiveStartKey: lastEvaluatedKey,
        }),
      );

      if (!result.Items || result.Items.length === 0) {
        break;
      }

      // Delete items in batches using the composite pk/sk keys
      const deleteRequests = result.Items.map((item: Record<string, unknown>) => ({
        DeleteRequest: {
          Key: { pk: item.pk, sk: item.sk },
        },
      }));

      // DynamoDB BatchWrite has a limit of 25 items per request
      const batchSize = 25;
      for (let i = 0; i < deleteRequests.length; i += batchSize) {
        const batch = deleteRequests.slice(i, i + batchSize);
        const command = new BatchWriteCommand({
          RequestItems: {
            [CONTENT_TABLE_NAME]: batch,
          },
        });
        await docClient.send(command);
        scannedItems += batch.length;
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
      if (!lastEvaluatedKey) {
        break;
      }
    }

    if (scannedItems > 0) {
      console.log(`  ✓ Deleted ${scannedItems} items from ${CONTENT_TABLE_NAME}`);
    } else {
      console.log(`  • ${CONTENT_TABLE_NAME}: empty`);
    }
  } catch (error) {
    // Table might not exist yet, which is fine
    const errorMsg = (error as Error).message || "";
    if (!errorMsg.includes("ResourceNotFoundException")) {
      console.warn(`  ⚠️  Error cleaning ${CONTENT_TABLE_NAME}:`, error);
    }
  }

  console.log("✅ Database cleanup completed");
}

/**
 * Helper: write an array of items via ElectroDB entity.create().
 * Uses Promise.all so writes are concurrent (no DynamoDB batch size limit to worry about).
 */
async function putItems<T>(
  entity: { create(item: T): { go(): Promise<unknown> } },
  items: T[],
): Promise<void> {
  await Promise.all(items.map((item) => entity.create(item).go()));
}

/**
 * Generate UUIDs
 */

/**
 * Generate fake Locations
 */
async function seedLocationsData() {
  console.log("\n📍 Seeding locations...");

  const locations = [
    {
      name: "Römerhalle Müllheim",
      description: "Haupttrainingsstätte des Markgräfler Volleys",
      street: "Zum Sportplatz 1",
      postal: "79379",
      city: "Müllheim",
    },
    {
      name: "Vereinsheim Markgräfler Volleys",
      description: "Soziale Räume für Mitgliedertreffen und Vereinsabende",
      street: "Markgrafenstrasse 45",
      postal: "79379",
      city: "Müllheim",
    },
    {
      name: "Beach-Anlage Römerhalle",
      description: "Outdoor Beach-Volleyball Plätze",
      street: "Zum Sportplatz 2",
      postal: "79379",
      city: "Müllheim",
    },
  ];

  // Add base metadata
  const locationsWithBaseMeta = locations.map((loc) => ({
    ...loc,
    id: crypto.randomUUID(),

    createdAt: dayjs().toISOString(),
    updatedAt: dayjs().toISOString(),
  }));

  // Validate against schema
  const validatedLocations = locationsWithBaseMeta.map((loc) => locationSchema.parse(loc));

  await putItems(entities.location, validatedLocations);
  console.log(`✅ Seeded ${validatedLocations.length} locations`);
  locationCache.push(...validatedLocations);
}

/**
 * Generate fake Members with team references
 */
async function seedMembersData() {
  console.log("\n👥 Seeding members...");

  const members = [
    {
      name: "Max Müller",
      email: "max.mueller@example.com",
      phone: "+49 7622 123456",
      isBoardMember: true,
      isTrainer: true,
      roleTitle: "Trainer Herren 1",
      avatarS3Key: "",
    },
    {
      name: "Sarah Hubertschmidt",
      email: "sarah.hubertschmidt@example.com",
      phone: "+49 7622 234567",
      isBoardMember: true,
      isTrainer: true,
      roleTitle: "Trainerin Damen 1",
      avatarS3Key: "",
    },
    {
      name: "Thomas Weber",
      email: "thomas.weber@example.com",
      phone: "+49 7622 345678",
      isBoardMember: true,
      roleTitle: "Kassier",
      createdAt: dayjs().subtract(2, "years").toISOString(),
    },
    {
      name: "Julia Fischer",
      email: "julia.fischer@example.com",
      isBoardMember: false,
      isTrainer: true,
      roleTitle: "Trainerin Jugend",
      avatarS3Key: "",
    },
    {
      name: "Klaus Hoffmann",
      email: "klaus.hoffmann@example.com",
      isBoardMember: false,
      isTrainer: false,
      roleTitle: "Schiedsrichter",
    },
    {
      name: "Anna-Maria Sofie Wagner",
      email: "anna.maria.sofie.wagner@example.com",
      isBoardMember: false,
      isTrainer: true,
      roleTitle: "Co-Trainer Damen 2",
      avatarS3Key: "",
    },
    {
      name: "Peter Lustig",
      email: "peter.lustig@example.com",
      isBoardMember: false,
      isTrainer: true,
      roleTitle: "Mitgliederverwaltung",
    },
  ];

  // Add base metadata
  const membersWithBaseMeta = members.map((m) => ({
    id: crypto.randomUUID(),
    createdAt: dayjs().toISOString(),
    updatedAt: dayjs().toISOString(),
    ...m, // after the above so dates can be overridden
  }));

  // Validate against schema
  const validatedMembers = membersWithBaseMeta.map((mem) => memberSchema.parse(mem));

  // Avatar URLs to download (only for members with avatarS3Key)
  const avatarUrls = [
    "https://picsum.photos/400/400?random=30",
    "https://picsum.photos/400/400?random=31",
    // Skip Thomas Weber (no avatar)
    "https://picsum.photos/400/400?random=32",
    // Skip Klaus Hoffmann (no avatar)
    "https://picsum.photos/400/400?random=33",
  ];

  // Download and upload avatars
  console.log("  Downloading and uploading member avatars...");
  let avatarIndex = 0;
  for (let i = 0; i < validatedMembers.length; i++) {
    const member = validatedMembers[i];
    // Only upload for members with avatar key (those with avatarS3Key property defined)
    if (i === 0 || i === 1 || i === 3 || i === 5) {
      try {
        const uploadKey = `uploads/members/${member.id}-avatar.jpg`;
        const finalKey = `members/${member.id}-avatar.jpg`;
        await uploadImageToS3(avatarUrls[avatarIndex], uploadKey);
        member.avatarS3Key = finalKey; // Store final key (Lambda will move from uploads/)
        avatarIndex++;
        // Delay to avoid overwhelming Lambda
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.warn(`  ⚠️  Failed to upload avatar for member ${member.name}:`, error);
        // Leave empty if upload fails
      }
    }
  }

  await putItems(entities.member, validatedMembers);
  console.log(`✅ Seeded ${validatedMembers.length} members`);

  membersCache.push(...validatedMembers);
}

/**
 * Generate fake Teams with member references
 */
async function seedTeamsData() {
  console.log("\n🏐 Seeding teams...");

  const teams = [
    {
      name: "Herren 1",
      description: "Erste Herrenmannschaft in der Landesliga",
      gender: "male" as const,
      ageGroup: "ab 16",
      league: "Landesliga",
      trainerIds: [membersCache[0]?.id, membersCache[1]?.id].filter(Boolean),
      pointOfContactIds: [membersCache[3]?.id].filter(Boolean),
      pictureS3Keys: [],
      trainingSchedules: [
        {
          days: [1, 3, 5], // Monday, Wednesday, Friday
          startTime: "19:00",
          endTime: "21:00",
          locationId: (locationCache[0]?.id ?? crypto.randomUUID()) as string,
        },
      ],
    },
    {
      name: "Damen 1",
      description: "Erste Damenmannschaft in der Oberliga",
      gender: "female" as const,
      ageGroup: "18",
      league: "Oberliga",
      trainerIds: [membersCache[1]?.id].filter(Boolean),
      pointOfContactIds: [membersCache[2]?.id].filter(Boolean),
      pictureS3Keys: [],
      trainingSchedules: [
        {
          days: [2, 4, 6], // Tuesday, Thursday, Saturday
          startTime: "19:30",
          endTime: "21:30",
          locationId: (locationCache[1]?.id ?? crypto.randomUUID()) as string,
        },
      ],
    },
    {
      name: "Jugend",
      description: "Jugendmannschaft U18",
      gender: "mixed" as const,
      ageGroup: "12-18 Jahre",
      pointOfContactIds: [membersCache[3]?.id].filter(Boolean),
      trainingSchedules: [
        {
          days: [1, 4], // Monday, Thursday
          startTime: "17:00",
          endTime: "18:30",
          locationId: (locationCache[2]?.id ?? crypto.randomUUID()) as string,
        },
      ],
    },
    {
      name: "Damen 2",
      description: "Zweite Damenmannschaft",
      gender: "female" as const,
      league: "Verbandsliga",
      trainerIds: [membersCache[5]?.id].filter(Boolean),
      trainingSchedules: [
        {
          days: [2, 5], // Tuesday, Friday
          startTime: "20:00",
          endTime: "22:00",
          locationId: (locationCache[0]?.id ?? crypto.randomUUID()) as string,
        },
      ],
    },
  ];

  // create team slugs from names and add dates
  const teamsWithBaseMeta = teams.map((t) => ({
    ...t,
    type: "team" as const,
    id: crypto.randomUUID(),
    createdAt: dayjs().toISOString(),
    updatedAt: dayjs().toISOString(),
    slug: slugify(t.name, true),
  }));

  // Validate against schema
  const validatedTeams = teamsWithBaseMeta.map((team) => teamSchema.parse(team));

  // Team picture URLs to download
  const teamPictureUrls = [
    ["https://picsum.photos/1200/800?random=40"], // Herren 1
    ["https://picsum.photos/1200/800?random=41"], // Damen 1
    // Jugend - no pictures
    // Damen 2 - no pictures
  ];

  // Download and upload team pictures
  console.log("  Downloading and uploading team pictures...");
  for (let i = 0; i < validatedTeams.length; i++) {
    const pictureUrls = teamPictureUrls[i] || [];
    // Reset pictureS3Keys to empty array before adding uploaded images
    validatedTeams[i].pictureS3Keys = [];
    for (const pictureUrl of pictureUrls) {
      try {
        const uploadKey = `uploads/teams/${validatedTeams[i].id}-${pictureUrls.indexOf(pictureUrl)}.jpg`;
        const finalKey = `teams/${validatedTeams[i].id}-${pictureUrls.indexOf(pictureUrl)}.jpg`;
        await uploadImageToS3(pictureUrl, uploadKey);
        validatedTeams[i].pictureS3Keys?.push(finalKey); // Store final key (Lambda will move from uploads/)
        // Delay to avoid overwhelming Lambda
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.warn(`  ⚠️  Failed to upload picture for team ${validatedTeams[i].name}:`, error);
        // Continue with next image
      }
    }
  }

  await putItems(entities.team, validatedTeams);
  console.log(`✅ Seeded ${validatedTeams.length} teams`);
  teamCache.push(...validatedTeams);
}

/**
 * Generate fake Sponsors
 */
async function seedSponsorsData() {
  console.log("\n💰 Seeding sponsors...");

  const sponsors = [
    {
      id: crypto.randomUUID(),
      name: "Müllheim Bank AG",
      description: "Hauptsponsor des Markgräfler Volleys seit 2020",
      websiteUrl: "https://www.muellheimbank.de",
      logoS3Key: "",
      ttl: Math.floor(dayjs().add(1, "year").valueOf() / 1000),
      createdAt: dayjs().subtract(2, "years").toISOString(),
      updatedAt: dayjs().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: "Sporthaus Schmidt",
      description: "Ausrüster für Sportbekleidung und Equipment",
      websiteUrl: "https://www.sporthaus-schmidt.de",
      logoS3Key: "",
      ttl: Math.floor(dayjs().add(6, "months").valueOf() / 1000),
      createdAt: dayjs().subtract(1, "year").toISOString(),
      updatedAt: dayjs().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: "Bäckerei Hoffmann",
      description: "Versorger von Verpflegung bei Heimspielen",
      logoS3Key: "",
      ttl: Math.floor(dayjs().add(8, "months").valueOf() / 1000),
      createdAt: dayjs().toISOString(),
      updatedAt: dayjs().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: "Fitness Plus Müllheim",
      description: "Partner für Krafttraining und Sportwissenschaft",
      websiteUrl: "https://www.fitnessplus-muellheim.de",
      logoS3Key: "",
      ttl: Math.floor(dayjs().add(10, "months").valueOf() / 1000),
      createdAt: dayjs().toISOString(),
      updatedAt: dayjs().toISOString(),
    },
  ];

  // Validate against schema
  const validatedSponsors = sponsors.map((sponsor) => sponsorSchema.parse(sponsor));

  // Logo URLs to download
  const logoUrls = [
    "https://picsum.photos/400/200?random=30",
    "https://picsum.photos/400/200?random=31",
    "https://picsum.photos/400/200?random=32",
    "https://picsum.photos/400/200?random=33",
  ];

  // Download and upload logos
  console.log("  Downloading and uploading sponsor logos...");
  for (let i = 0; i < validatedSponsors.length; i++) {
    try {
      const uploadKey = `uploads/sponsors/${validatedSponsors[i].id}-logo.jpg`;
      const finalKey = `sponsors/${validatedSponsors[i].id}-logo.jpg`;
      await uploadImageToS3(logoUrls[i], uploadKey);
      validatedSponsors[i].logoS3Key = finalKey; // Store final key (Lambda will move from uploads/)
      // Delay to avoid overwhelming Lambda
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.warn(`  ⚠️  Failed to upload logo for ${validatedSponsors[i].name}:`, error);
      // Continue without logo
    }
  }

  // SponsorEntity uses ttl for DynamoDB-based automatic expiry.
  await putItems(entities.sponsor, validatedSponsors);
  console.log(`✅ Seeded ${validatedSponsors.length} sponsors`);
}

async function main() {
  try {
    // Handle user creation
    if (shouldCreateUser && userEmail) {
      await createCmsUser(userEmail);
      return;
    }

    // Handle cleanup-only mode
    if (cleanupOnly) {
      await cleanupDatabase();
      return;
    }

    // Run cleanup only if --cleanup flag is present
    if (shouldCleanup) {
      await cleanupDatabase();
    }

    // Seed in order of dependencies
    if (seedLocations) {
      await seedLocationsData();
    }

    if (seedMembers) {
      await seedMembersData();
    }

    if (seedTeams) {
      await seedTeamsData();
    }

    if (seedSponsors) {
      await seedSponsorsData();
    }

    console.log("\n🎉 Database seeding completed successfully!\n");
  } catch (error) {
    console.error("\n❌ Database seeding failed:", error);
    process.exit(1);
  }
}

main();
