import crypto from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";
import { AppError } from "../middlewares/errorHandler.js";

const s3 = new S3Client({ region: env.AWS_REGION });

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/webp": ".webp",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

function assertConfigured() {
  if (!env.AWS_S3_BUCKET || !env.AWS_REGION) {
    throw new AppError(
      503,
      "S3_NOT_CONFIGURED",
      "Image upload is not configured (AWS_S3_BUCKET/AWS_REGION missing)"
    );
  }
}

export const uploadService = {
  extFor(contentType: string): string {
    const ext = EXT_BY_CONTENT_TYPE[contentType];
    if (!ext) throw new AppError(400, "UNSUPPORTED_IMAGE_TYPE", `Unsupported content type: ${contentType}`);
    return ext;
  },

  buildKey(prefix: string, contentType: string): string {
    return `${prefix}/${crypto.randomUUID()}${this.extFor(contentType)}`;
  },

  // Deterministic key (no random UUID) — re-uploading overwrites the same S3
  // object instead of accumulating a new one every time, for slots that hold
  // exactly one image (e.g. a product's primary photo).
  buildStableKey(prefix: string, name: string, contentType: string): string {
    return `${prefix}/${name}${this.extFor(contentType)}`;
  },

  buildPublicUrl(key: string): string {
    assertConfigured();
    return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
  },

  // Browser uploads the file bytes directly to S3 with this URL — our server
  // never sees the file, which halves the transfer (no browser->us->S3 hop).
  async createPresignedUpload(key: string, contentType: string): Promise<{ uploadUrl: string; publicUrl: string }> {
    assertConfigured();
    const command = new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    return { uploadUrl, publicUrl: this.buildPublicUrl(key) };
  },
};
