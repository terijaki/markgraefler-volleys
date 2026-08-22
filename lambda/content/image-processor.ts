/// <reference types="bun-types" />
/**
 * Lambda function to process uploaded images using Bun.Image
 * Triggered by S3 upload events
 * Generates responsive variants (480px, 800px, 1200px) in JPEG and WebP format
 * Also compresses and overwrites the original image (capped at 5MB)
 */

import type { Readable } from "node:stream";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { IMAGE_SIZES } from "@utils/image-config";
import type { S3Event } from "aws-lambda";
import { Sentry } from "../utils/sentry";
import {
  compressOriginal,
  generateJpegVariant,
  generateWebpVariant,
  getContentTypeForExtension,
  getImageExtension,
} from "./image-utils";

const s3Client = new S3Client();

interface ProcessingJobResult {
  originalKey: string;
  variants: Record<string, string>;
  success: boolean;
  error?: string;
}

const downloadImageFromS3 = async (
  bucket: string,
  key: string,
): Promise<{ buffer: Buffer; metadata?: Record<string, string> }> => {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error("No image body received from S3");
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as Readable) {
    chunks.push(chunk);
  }
  return { buffer: Buffer.concat(chunks), metadata: response.Metadata };
};

const uploadImageToS3 = async (
  bucket: string,
  key: string,
  imageBuffer: Buffer,
  contentType: string,
  metadata?: Record<string, string>,
): Promise<void> => {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: imageBuffer,
    ContentType: contentType,
    Metadata: metadata,
  });
  await s3Client.send(command);
};

/** Process image and generate variants using Bun.Image */
const processImage = async (bucket: string, uploadKey: string): Promise<Record<string, string>> => {
  const variants: Record<string, string> = {};

  const { buffer: imageBuffer } = await downloadImageFromS3(bucket, uploadKey);
  const input = new Uint8Array(imageBuffer);

  const finalKey = uploadKey.replace(/^uploads\//, "");

  const keyParts = finalKey.split("/");
  const filename = keyParts[keyParts.length - 1];
  const baseFilename = filename.replace(/\.[^.]+$/, "");
  const sourceExtension = getImageExtension(filename);
  const originalContentType = getContentTypeForExtension(sourceExtension);
  const outputFolder = finalKey.substring(0, finalKey.lastIndexOf("/"));

  try {
    if (sourceExtension === "gif") {
      await uploadImageToS3(bucket, finalKey, imageBuffer, originalContentType);
      console.log(`Uploaded original GIF to ${finalKey} without recompression`);
    } else {
      const compressedBuffer = await compressOriginal(input, sourceExtension);
      await uploadImageToS3(bucket, finalKey, compressedBuffer, originalContentType);
      console.log(`Uploaded compressed original to ${finalKey}`);
    }
  } catch (error) {
    console.error("Failed to compress and overwrite original:", error);
    throw error;
  }

  for (const size of IMAGE_SIZES) {
    try {
      const jpegBuffer = await generateJpegVariant(input, size);
      const jpegKey = `${outputFolder}/${baseFilename}-${size}w.jpg`;
      await uploadImageToS3(bucket, jpegKey, jpegBuffer, "image/jpeg");
      variants[`${size}w`] = jpegKey;
    } catch (error) {
      console.error(`Failed to generate JPEG variant ${size}w:`, error);
    }

    try {
      const webpBuffer = await generateWebpVariant(input, size);
      const webpKey = `${outputFolder}/${baseFilename}-${size}w.webp`;
      await uploadImageToS3(bucket, webpKey, webpBuffer, "image/webp");
      variants[`${size}w-webp`] = webpKey;
    } catch (error) {
      console.error(`Failed to generate WebP variant ${size}w:`, error);
    }
  }

  return variants;
};

const lambdaHandler = async (event: S3Event): Promise<ProcessingJobResult[]> => {
  const results: ProcessingJobResult[] = [];

  for (const record of event.Records) {
    try {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key);

      console.log(`Processing image: s3://${bucket}/${key}`);

      const parts = key.split("/");
      const filename = parts[parts.length - 1];

      if (/-\d{3,4}w\.\w+$/.test(filename)) {
        console.log(`Skipping already-processed variant: ${key}`);
        continue;
      }

      if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) {
        console.log(`Skipping non-image file: ${key}`);
        continue;
      }

      const variants = await processImage(bucket, key);

      console.log(`Generated variants for ${key}:`, variants);

      results.push({
        originalKey: key,
        variants,
        success: true,
      });
    } catch (error) {
      console.error(`Error processing image: ${error}`);
      results.push({
        originalKey: `${record.s3.bucket.name}/${record.s3.object.key}`,
        variants: {},
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
};

export const handler = Sentry.wrapHandler(lambdaHandler);
