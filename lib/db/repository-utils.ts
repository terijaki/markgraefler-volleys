import dayjs from "dayjs";
import { z } from "zod";

export function isoTimestampNow(): string {
  return dayjs().toISOString();
}

export function withTimestamps<T extends Record<string, unknown>>(
  item: T,
): T & { createdAt: string; updatedAt: string } {
  const now = isoTimestampNow();
  return {
    ...item,
    createdAt: now,
    updatedAt: now,
  };
}

export function parseWithSchema<T>(schema: z.ZodType<T>, value: unknown, message: string): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(message, { cause: error });
    }
    throw error;
  }
}
