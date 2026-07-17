import type { Entity } from "dynamodb-toolbox/entity";
import { EntityDTO } from "dynamodb-toolbox/entity/actions/dto";
import { EntityFormatter } from "dynamodb-toolbox/entity/actions/format";
import { EntityParser } from "dynamodb-toolbox/entity/actions/parse";
import { expect } from "vite-plus/test";
import type { z } from "zod";

/** DynamoDB key / metadata attrs excluded from business-field parity checks */
export const GENERATED_KEY_FIELDS = [
  "pk",
  "sk",
  "gsi1pk",
  "gsi1sk",
  "gsi3pk",
  "gsi3sk",
  "gsi4pk",
  "gsi4sk",
  "gsi5pk",
  "gsi5sk",
  "_et",
  "_ct",
  "_md",
] as const;

function isGeneratedKeyField(name: string): boolean {
  return (GENERATED_KEY_FIELDS as readonly string[]).includes(name);
}

export function getZodFieldNames(schema: z.ZodObject<z.ZodRawShape>): string[] {
  return Object.keys(schema.shape).sort();
}

export function getToolboxBusinessFieldNames(entity: Entity): string[] {
  const dto = entity.build(EntityDTO);
  return Object.entries(dto.schema.attributes)
    .filter(([name, attr]) => !attr.hidden && !isGeneratedKeyField(name))
    .map(([name]) => name)
    .sort();
}

export function assertFieldParity(
  entityName: string,
  zodSchema: z.ZodObject<z.ZodRawShape>,
  entity: Entity,
): void {
  const zodFields = getZodFieldNames(zodSchema);
  const toolboxFields = getToolboxBusinessFieldNames(entity);
  const toolboxSet = new Set(toolboxFields);

  const missing = zodFields.filter((f) => !toolboxSet.has(f));
  if (missing.length > 0) {
    throw new Error(
      `[${entityName}] Zod fields missing from Toolbox entity: ${missing.join(", ")}`,
    );
  }

  const zodSet = new Set(zodFields);
  const keySet = new Set<string>(GENERATED_KEY_FIELDS);
  const surplus = toolboxFields.filter((f) => !zodSet.has(f) && !keySet.has(f));
  if (surplus.length > 0) {
    throw new Error(
      `[${entityName}] Toolbox business attrs without Zod counterpart: ${surplus.join(", ")}`,
    );
  }
}

export function assertWriteRoundTrip(
  entity: Entity,
  zodSchema: z.ZodObject<z.ZodRawShape>,
  fixture: Record<string, unknown>,
): void {
  const parsed = zodSchema.parse(fixture);
  const { item } = entity.build(EntityParser).parse(parsed);
  const formatted = entity.build(EntityFormatter).format(item);
  zodSchema.parse(formatted);
}

export function assertKeyIsolation(
  entity: Entity,
  fixtureA: Record<string, unknown>,
  fixtureB: Record<string, unknown>,
  keyFields: readonly string[],
): void {
  const { item: itemA } = entity.build(EntityParser).parse(fixtureA);
  const { item: itemB } = entity.build(EntityParser).parse(fixtureB);

  for (const field of [
    "pk",
    "sk",
    "gsi1pk",
    "gsi1sk",
    "gsi3pk",
    "gsi3sk",
    "gsi4pk",
    "gsi4sk",
    "gsi5pk",
    "gsi5sk",
  ] as const) {
    if (field in itemA || field in itemB) {
      expect(itemA[field]).toBe(itemB[field]);
    }
  }

  for (const field of keyFields) {
    expect(fixtureA[field]).toBe(fixtureB[field]);
  }
}

export type ZodToolboxContractConfig = {
  entityName: string;
  zodSchema: z.ZodObject<z.ZodRawShape>;
  entity: Entity;
  minimalFixture: Record<string, unknown>;
  maximalFixture: Record<string, unknown>;
  keyFields: readonly string[];
  keyIsolationVariant: Record<string, unknown>;
};

export function assertGoldenSnapshot(
  entityName: string,
  entity: Entity,
  fixture: Record<string, unknown>,
): void {
  const { item } = entity.build(EntityParser).parse(fixture);
  expect(item).toMatchSnapshot(`${entityName}-saved-item`);
}

export function assertZodToolboxContract(config: ZodToolboxContractConfig): void {
  assertFieldParity(config.entityName, config.zodSchema, config.entity);
  assertWriteRoundTrip(config.entity, config.zodSchema, config.minimalFixture);
  assertWriteRoundTrip(config.entity, config.zodSchema, config.maximalFixture);
  assertGoldenSnapshot(config.entityName, config.entity, config.maximalFixture);
  assertKeyIsolation(
    config.entity,
    config.maximalFixture,
    config.keyIsolationVariant,
    config.keyFields,
  );
}

export function assertKeyEncoding(
  entity: Entity,
  fixture: Record<string, unknown>,
  expected: Record<string, string>,
): void {
  const { item } = entity.build(EntityParser).parse(fixture);
  for (const [key, value] of Object.entries(expected)) {
    expect(item[key]).toBe(value);
  }
}
