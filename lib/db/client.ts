/**
 * DynamoDB client configuration
 */

import { Tracer } from "@aws-lambda-powertools/tracer";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

/** Shared marshalling options so undefined projection fields are stripped. */
export const dynamoDocumentClientOptions = {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
} as const;

/** DynamoDB client instance with X-Ray tracing */
const dynamoDBClient = new DynamoDBClient({});

// Instrument DynamoDB client with X-Ray tracing to capture query timings
const tracer = new Tracer({ serviceName: "mv-api" });
const tracedDynamoDBClient = tracer.captureAWSv3Client(dynamoDBClient);

/** Document client for easier data marshalling with tracing enabled */
export const docClient = DynamoDBDocumentClient.from(
  tracedDynamoDBClient,
  dynamoDocumentClientOptions,
);

/** Export raw client for advanced use cases */
export { tracedDynamoDBClient as dynamoDBClient };
