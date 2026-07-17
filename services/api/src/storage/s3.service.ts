import { randomUUID } from "node:crypto";

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "../config/env";

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const ALLOWED_PHOTO_TYPES = Object.keys(EXTENSION_BY_TYPE);

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  // Internal endpoint for bucket admin; browser-facing endpoint for presigning —
  // SigV4 signs the host, so upload URLs must carry the host the browser will hit.
  private readonly client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: "ap-south-1",
    forcePathStyle: true, // MinIO
    credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
  });
  private readonly presignClient = new S3Client({
    endpoint: env.S3_PUBLIC_URL ?? env.S3_ENDPOINT,
    region: "ap-south-1",
    forcePathStyle: true,
    credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
  });

  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }));
        // Dev: public read for profile photos; prod fronts this with CloudFront.
        await this.client.send(
          new PutBucketPolicyCommand({
            Bucket: env.S3_BUCKET,
            Policy: JSON.stringify({
              Version: "2012-10-17",
              Statement: [
                {
                  Effect: "Allow",
                  Principal: { AWS: ["*"] },
                  Action: ["s3:GetObject"],
                  Resource: [`arn:aws:s3:::${env.S3_BUCKET}/photos/*`],
                },
              ],
            }),
          }),
        );
        this.logger.log(`created bucket '${env.S3_BUCKET}' with public-read photos/`);
      } catch (error) {
        // Non-fatal: uploads fail loudly later, but the api must still boot.
        this.logger.warn(`could not ensure bucket '${env.S3_BUCKET}': ${String(error)}`);
      }
    }
  }

  /** Presigned PUT for a user photo; returns the public URL to store on the profile. */
  async presignPhotoUpload(
    userId: string,
    contentType: string,
  ): Promise<{ upload_url: string; public_url: string; key: string }> {
    const extension = EXTENSION_BY_TYPE[contentType];
    if (!extension) throw new Error(`unsupported content type: ${contentType}`);
    const key = `photos/${userId}/${randomUUID()}.${extension}`;
    const upload_url = await getSignedUrl(
      this.presignClient,
      new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, ContentType: contentType }),
      { expiresIn: 600 },
    );
    const publicBase = env.S3_PUBLIC_URL ?? env.S3_ENDPOINT;
    return { upload_url, public_url: `${publicBase}/${env.S3_BUCKET}/${key}`, key };
  }
}
