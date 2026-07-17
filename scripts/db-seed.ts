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
import {
  locationsRepository,
  membersRepository,
  sponsorsRepository,
  teamsRepository,
} from "@/lib/db/repositories";
import type { Location, Member, Team } from "@/lib/db/types";
import { Club } from "@/project.config";
import { getSanitizedBranch } from "@/utils/git";

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
process.env.CONTENT_TABLE_NAME = CONTENT_TABLE_NAME;

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

const locationCache: Location[] = [];
const membersCache: Member[] = [];
const teamCache: Team[] = [];

/**
 * Create a CMS user (whitelisted email) in the content table via the members repository.
 * The user can then sign in via email OTP (passwordless) at the CMS admin panel.
 */
async function createCmsUser(email: string): Promise<void> {
  console.log(`\n👤 Granting Admin role to member: ${email}...`);

  // Check if a member with this privateEmail already exists
  const existing = await membersRepository.getByPrivateEmail(email);
  if (existing) {
    if (existing.authRole) {
      console.log(`ℹ️  Member ${email} already has authRole: ${existing.authRole}`);
      process.exit(0);
    }
    await membersRepository.update(existing.id, { authRole: "Admin" });
    console.log(`✅ Admin role granted to existing member ${email}`);
    console.log(`   The member can now sign in at the CMS with email OTP (passwordless).`);
    return;
  }

  await membersRepository.create({
    type: "member",
    name: email.split("@")[0] ?? email,
    privateEmail: email,
    authRole: "Admin",
  });

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

  for (const loc of locations) {
    const created = await locationsRepository.create({
      type: "location",
      name: loc.name,
      description: loc.description,
      street: loc.street,
      postal: loc.postal,
      city: loc.city,
    });
    locationCache.push(created);
  }

  console.log(`✅ Seeded ${locationCache.length} locations`);
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
      isTrainer: true,
      roleTitle: "Trainer Herren 1",
      withAvatar: true,
    },
    {
      name: "Sarah Hubertschmidt",
      email: "sarah.hubertschmidt@example.com",
      phone: "+49 7622 234567",
      isTrainer: true,
      roleTitle: "Trainerin Damen 1",
      withAvatar: true,
    },
    {
      name: "Thomas Weber",
      email: "thomas.weber@example.com",
      phone: "+49 7622 345678",
      roleTitle: "Kassier",
    },
    {
      name: "Julia Fischer",
      email: "julia.fischer@example.com",
      isTrainer: true,
      roleTitle: "Trainerin Jugend",
      withAvatar: true,
    },
    {
      name: "Klaus Hoffmann",
      email: "klaus.hoffmann@example.com",
      isTrainer: false,
      roleTitle: "Schiedsrichter",
    },
    {
      name: "Anna-Maria Sofie Wagner",
      email: "anna.maria.sofie.wagner@example.com",
      isTrainer: true,
      roleTitle: "Co-Trainer Damen 2",
      withAvatar: true,
    },
    {
      name: "Peter Lustig",
      email: "peter.lustig@example.com",
      isTrainer: true,
      roleTitle: "Mitgliederverwaltung",
    },
  ];

  const avatarUrls = [
    "https://picsum.photos/400/400?random=30",
    "https://picsum.photos/400/400?random=31",
    "https://picsum.photos/400/400?random=32",
    "https://picsum.photos/400/400?random=33",
  ];

  console.log("  Downloading and uploading member avatars...");
  let avatarIndex = 0;
  for (const member of members) {
    const created = await membersRepository.create({
      type: "member",
      name: member.name,
      privateEmail: member.email,
      phone: member.phone,
      isTrainer: member.isTrainer,
      roleTitle: member.roleTitle,
    });

    if (member.withAvatar) {
      try {
        const uploadKey = `uploads/members/${created.id}-avatar.jpg`;
        const finalKey = `members/${created.id}-avatar.jpg`;
        await uploadImageToS3(avatarUrls[avatarIndex], uploadKey);
        await membersRepository.update(created.id, { avatarS3Key: finalKey });
        avatarIndex++;
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.warn(`  ⚠️  Failed to upload avatar for member ${member.name}:`, error);
      }
    }

    const refreshed = await membersRepository.getById(created.id);
    if (refreshed) {
      membersCache.push(refreshed);
    }
  }

  console.log(`✅ Seeded ${membersCache.length} members`);
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
      trainerIds: [membersCache[0]?.id, membersCache[1]?.id].filter((id): id is string => !!id),
      pointOfContactIds: [membersCache[3]?.id].filter((id): id is string => !!id),
      pictureS3Keys: [],
      trainingSchedules: [
        {
          days: [1, 3, 5], // Monday, Wednesday, Friday
          startTime: "19:00",
          endTime: "21:00",
          locationId: locationCache[0]?.id ?? "",
        },
      ],
    },
    {
      name: "Damen 1",
      description: "Erste Damenmannschaft in der Oberliga",
      gender: "female" as const,
      ageGroup: "18",
      league: "Oberliga",
      trainerIds: [membersCache[1]?.id].filter((id): id is string => !!id),
      pointOfContactIds: [membersCache[2]?.id].filter((id): id is string => !!id),
      pictureS3Keys: [],
      trainingSchedules: [
        {
          days: [2, 4, 6], // Tuesday, Thursday, Saturday
          startTime: "19:30",
          endTime: "21:30",
          locationId: locationCache[1]?.id ?? "",
        },
      ],
    },
    {
      name: "Jugend",
      description: "Jugendmannschaft U18",
      gender: "mixed" as const,
      ageGroup: "12-18 Jahre",
      pointOfContactIds: [membersCache[3]?.id].filter((id): id is string => !!id),
      trainingSchedules: [
        {
          days: [1, 4], // Monday, Thursday
          startTime: "17:00",
          endTime: "18:30",
          locationId: locationCache[2]?.id ?? "",
        },
      ],
    },
    {
      name: "Damen 2",
      description: "Zweite Damenmannschaft",
      gender: "female" as const,
      league: "Verbandsliga",
      trainerIds: [membersCache[5]?.id].filter((id): id is string => !!id),
      trainingSchedules: [
        {
          days: [2, 5], // Tuesday, Friday
          startTime: "20:00",
          endTime: "22:00",
          locationId: locationCache[0]?.id ?? "",
        },
      ],
    },
  ];

  const teamPictureUrls = [
    ["https://picsum.photos/1200/800?random=40"],
    ["https://picsum.photos/1200/800?random=41"],
  ];

  console.log("  Downloading and uploading team pictures...");
  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];
    const created = await teamsRepository.create({
      type: "team",
      name: team.name,
      gender: team.gender,
      description: team.description,
      ageGroup: team.ageGroup,
      league: team.league,
      trainerIds: team.trainerIds,
      pointOfContactIds: team.pointOfContactIds,
      trainingSchedules: team.trainingSchedules,
    });

    const pictureUrls = teamPictureUrls[i] ?? [];
    const pictureS3Keys: string[] = [];
    for (const [pictureIndex, pictureUrl] of pictureUrls.entries()) {
      try {
        const uploadKey = `uploads/teams/${created.id}-${pictureIndex}.jpg`;
        const finalKey = `teams/${created.id}-${pictureIndex}.jpg`;
        await uploadImageToS3(pictureUrl, uploadKey);
        pictureS3Keys.push(finalKey);
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.warn(`  ⚠️  Failed to upload picture for team ${team.name}:`, error);
      }
    }

    if (pictureS3Keys.length > 0) {
      await teamsRepository.update(created.id, { pictureS3Keys });
    }

    const refreshed = await teamsRepository.getById(created.id);
    if (refreshed) {
      teamCache.push(refreshed);
    }
  }

  console.log(`✅ Seeded ${teamCache.length} teams`);
}

/**
 * Generate fake Sponsors
 */
async function seedSponsorsData() {
  console.log("\n💰 Seeding sponsors...");

  const sponsors = [
    {
      name: "Müllheim Bank AG",
      description: "Hauptsponsor des Markgräfler Volleys seit 2020",
      websiteUrl: "https://www.muellheimbank.de",
      ttl: Math.floor(dayjs().add(1, "year").valueOf() / 1000),
    },
    {
      name: "Sporthaus Schmidt",
      description: "Ausrüster für Sportbekleidung und Equipment",
      websiteUrl: "https://www.sporthaus-schmidt.de",
      ttl: Math.floor(dayjs().add(6, "months").valueOf() / 1000),
    },
    {
      name: "Bäckerei Hoffmann",
      description: "Versorger von Verpflegung bei Heimspielen",
      ttl: Math.floor(dayjs().add(8, "months").valueOf() / 1000),
    },
    {
      name: "Fitness Plus Müllheim",
      description: "Partner für Krafttraining und Sportwissenschaft",
      websiteUrl: "https://www.fitnessplus-muellheim.de",
      ttl: Math.floor(dayjs().add(10, "months").valueOf() / 1000),
    },
  ];

  const logoUrls = [
    "https://picsum.photos/400/200?random=30",
    "https://picsum.photos/400/200?random=31",
    "https://picsum.photos/400/200?random=32",
    "https://picsum.photos/400/200?random=33",
  ];

  console.log("  Downloading and uploading sponsor logos...");
  for (let i = 0; i < sponsors.length; i++) {
    const sponsor = sponsors[i];
    const created = await sponsorsRepository.create({
      type: "sponsor",
      name: sponsor.name,
      description: sponsor.description,
      websiteUrl: sponsor.websiteUrl,
      ttl: sponsor.ttl,
    });

    try {
      const uploadKey = `uploads/sponsors/${created.id}-logo.jpg`;
      const finalKey = `sponsors/${created.id}-logo.jpg`;
      await uploadImageToS3(logoUrls[i], uploadKey);
      await sponsorsRepository.update(created.id, { logoS3Key: finalKey });
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.warn(`  ⚠️  Failed to upload logo for ${sponsor.name}:`, error);
    }
  }

  console.log(`✅ Seeded ${sponsors.length} sponsors`);
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
