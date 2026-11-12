import { beforeEach, describe, expect, it } from "vite-plus/test";
import { mockClient } from "aws-sdk-client-mock";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { fixtureImageUrl } from "@/fixtures/seed-images/fixture-image";
import { uploadClubLogoToS3 } from "./club-logo-upload";

const s3Mock = mockClient(S3Client);

describe("uploadClubLogoToS3", () => {
  beforeEach(() => {
    s3Mock.reset();
    s3Mock.on(PutObjectCommand).resolves({});
  });

  it("uploads in-repo fixture logos without HTTP", async () => {
    const key = await uploadClubLogoToS3(
      "test-bucket",
      "club-markgraefler-volleys",
      fixtureImageUrl("clubs/club-markgraefler-volleys.jpg"),
    );

    expect(key).toBe("sams-logos/club-markgraefler-volleys.jpg");
    expect(s3Mock.calls()).toHaveLength(1);
    const command = s3Mock.call(0).args[0] as PutObjectCommand;
    const input = command.input;
    expect(input.ContentType).toBe("image/jpeg");
    expect(input.Body).toBeInstanceOf(Buffer);
  });

  it("returns undefined when the bucket name is empty", async () => {
    const key = await uploadClubLogoToS3(
      "",
      "club-markgraefler-volleys",
      fixtureImageUrl("clubs/club-markgraefler-volleys.jpg"),
    );
    expect(key).toBeUndefined();
    expect(s3Mock.calls()).toHaveLength(0);
  });
});
