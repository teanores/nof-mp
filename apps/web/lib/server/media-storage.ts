import crypto from "node:crypto";

const maxImageBytes = 5 * 1024 * 1024;
const presignExpiresSeconds = 300;

type MediaExtension = "jpg" | "png" | "webp";

interface ValidateImageUploadInput {
  contentType: string;
  fileName: string;
  magicBytes: Buffer;
  sizeBytes: number;
}

type ValidateImageUploadResult =
  | { extension: MediaExtension; ok: true }
  | { ok: false; reason: "magic_mismatch" | "too_large" | "unsupported_type" };

const allowedTypes: Record<string, { extensions: MediaExtension[]; matches: (bytes: Buffer) => boolean }> = {
  "image/jpeg": {
    extensions: ["jpg"],
    matches: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  "image/png": {
    extensions: ["png"],
    matches: (bytes) => bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")),
  },
  "image/webp": {
    extensions: ["webp"],
    matches: (bytes) => bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP",
  },
};

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string): Buffer {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function safeSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "user";
}

function mediaConfig() {
  return {
    accessKeyId: process.env.NOF_MEDIA_S3_ACCESS_KEY_ID ?? "",
    bucket: process.env.NOF_MEDIA_S3_BUCKET_NOF_MP ?? "nof-mp",
    endpoint: process.env.NOF_MEDIA_S3_ENDPOINT ?? "http://127.0.0.1:9000",
    region: process.env.NOF_MEDIA_S3_REGION ?? "us-east-1",
    secretAccessKey: process.env.NOF_MEDIA_S3_SECRET_ACCESS_KEY ?? "",
  };
}

export function validateImageUploadRequest(input: ValidateImageUploadInput): ValidateImageUploadResult {
  if (input.sizeBytes > maxImageBytes) {
    return { ok: false, reason: "too_large" };
  }
  const type = allowedTypes[input.contentType];
  const extension = input.fileName.toLowerCase().split(".").pop();
  if (!type || !extension || !type.extensions.includes(extension as MediaExtension)) {
    return { ok: false, reason: "unsupported_type" };
  }
  if (!type.matches(input.magicBytes)) {
    return { ok: false, reason: "magic_mismatch" };
  }
  return { extension: extension as MediaExtension, ok: true };
}

export function buildMediaObjectKey(input: { extension: MediaExtension; userId: string }): string {
  return `avatars/${safeSegment(input.userId)}/${crypto.randomUUID()}.${input.extension}`;
}

export function createPresignedMediaUrl(input: {
  contentType?: string;
  method: "GET" | "PUT";
  now?: Date;
  objectKey: string;
}): string {
  const config = mediaConfig();
  if (!config.accessKeyId || !config.secretAccessKey) {
    throw new Error("media_storage_not_configured");
  }

  const now = input.now ?? new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const endpoint = new URL(config.endpoint);
  const encodedKey = input.objectKey.split("/").map(encodeURIComponent).join("/");
  const canonicalUri = `/${encodeURIComponent(config.bucket)}/${encodedKey}`;
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const signedHeaders = input.method === "PUT" && input.contentType ? "content-type;host" : "host";

  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(presignExpiresSeconds),
    "X-Amz-SignedHeaders": signedHeaders,
  });

  const canonicalHeaders =
    input.method === "PUT" && input.contentType
      ? `content-type:${input.contentType}\nhost:${endpoint.host}\n`
      : `host:${endpoint.host}\n`;
  const canonicalRequest = [
    input.method,
    canonicalUri,
    query.toString(),
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${config.secretAccessKey}`, dateStamp), config.region), "s3"), "aws4_request");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  query.set("X-Amz-Signature", signature);

  return `${endpoint.origin}${canonicalUri}?${query.toString()}`;
}

export const mediaStorageLimits = {
  maxImageBytes,
  presignExpiresSeconds,
};
