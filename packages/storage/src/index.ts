import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const CONTENT_TYPES = {
  json: "application/json",
  sqlite: "application/vnd.sqlite3",
} as const;

export type StorageConfig = {
  endpoint: string;
  region?: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export type StorageEnvironment = {
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET?: string;
};

export type PutFileInput = {
  key: string;
  body: PutObjectCommandInput["Body"];
  contentType: string;
  cacheControl?: string;
};

export type PutJsonInput = {
  key: string;
  value: unknown;
  cacheControl?: string;
};

export type SignedDownloadUrlInput = {
  key: string;
  expiresIn?: number;
};

export type Storage = {
  readonly client: S3Client;
  readonly bucket: string;
  putFile(input: PutFileInput): Promise<void>;
  putJson(input: PutJsonInput): Promise<void>;
  getJson(key: string): Promise<unknown | undefined>;
  signedDownloadUrl(input: SignedDownloadUrlInput): Promise<string>;
};

export function createStorage(config: StorageConfig): Storage {
  const client = new S3Client({
    region: config.region ?? "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  const putFile = async ({ key, body, contentType, cacheControl }: PutFileInput) => {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ...(cacheControl ? { CacheControl: cacheControl } : {}),
      }),
    );
  };

  const putJson = async ({ key, value, cacheControl }: PutJsonInput) => {
    await putFile({
      key,
      body: JSON.stringify(value),
      contentType: CONTENT_TYPES.json,
      cacheControl,
    });
  };

  const getJson = async (key: string): Promise<unknown | undefined> => {
    try {
      const result = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
      if (!result.Body) throw new Error(`Storage object ${key} is empty`);
      const value: unknown = JSON.parse(await result.Body.transformToString());
      return value;
    } catch (error) {
      if (isObjectNotFound(error)) return undefined;
      throw error;
    }
  };

  const signedDownloadUrl = ({ key, expiresIn = 300 }: SignedDownloadUrlInput) =>
    getSignedUrl(client, new GetObjectCommand({ Bucket: config.bucket, Key: key }), { expiresIn });

  return {
    client,
    bucket: config.bucket,
    putFile,
    putJson,
    getJson,
    signedDownloadUrl,
  };
}

export function createStorageFromEnv(environment: StorageEnvironment): Storage {
  const accountId = required(environment.R2_ACCOUNT_ID, "R2_ACCOUNT_ID");
  const accessKeyId = required(environment.R2_ACCESS_KEY_ID, "R2_ACCESS_KEY_ID");
  const secretAccessKey = required(environment.R2_SECRET_ACCESS_KEY, "R2_SECRET_ACCESS_KEY");

  return createStorage({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    accessKeyId,
    secretAccessKey,
    bucket: environment.R2_BUCKET ?? "callus",
  });
}

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function isObjectNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? error.name : undefined;
  const metadata =
    "$metadata" in error && error.$metadata && typeof error.$metadata === "object"
      ? error.$metadata
      : undefined;
  const status = metadata && "httpStatusCode" in metadata ? metadata.httpStatusCode : undefined;
  return name === "NoSuchKey" || name === "NotFound" || status === 404;
}
