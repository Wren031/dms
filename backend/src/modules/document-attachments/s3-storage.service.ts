import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Config } from '../../config/s3.config';
import { randomUUID } from 'crypto';

export interface PresignedUpload {
  uploadUrl: string;
  storageKey: string;
  expiresIn: number;
  method: 'PUT';
  headers: Record<string, string>;
}

@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly client: S3Client;
  private readonly cfg: S3Config;

  constructor(configService: ConfigService) {
    this.cfg = configService.getOrThrow<S3Config>('s3');
    this.client = new S3Client({
      region: this.cfg.region,
      endpoint: this.cfg.endpoint,
      forcePathStyle: this.cfg.forcePathStyle,
      credentials:
        this.cfg.accessKey && this.cfg.secretKey
          ? { accessKeyId: this.cfg.accessKey, secretAccessKey: this.cfg.secretKey }
          : undefined,
    });
  }

  buildKey(documentId: string, originalName: string): string {
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `documents/${documentId}/${randomUUID()}-${safeName}`;
  }

  async createPresignedUpload(
    key: string,
    mimeType: string,
  ): Promise<PresignedUpload> {
    const cmd = new PutObjectCommand({
      Bucket: this.cfg.bucket,
      Key: key,
      ContentType: mimeType,
    });
    const uploadUrl = await getSignedUrl(this.client, cmd, {
      expiresIn: this.cfg.presignExpires,
    });
    return {
      uploadUrl,
      storageKey: key,
      expiresIn: this.cfg.presignExpires,
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
    };
  }

  async createPresignedDownload(key: string, asFileName?: string): Promise<string> {
    const cmd = new GetObjectCommand({
      Bucket: this.cfg.bucket,
      Key: key,
      ResponseContentDisposition: asFileName
        ? `attachment; filename="${asFileName.replace(/"/g, '')}"`
        : undefined,
    });
    return getSignedUrl(this.client, cmd, { expiresIn: this.cfg.presignExpires });
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: key }),
      );
    } catch (err) {
      this.logger.warn(`Failed to delete object ${key}: ${String(err)}`);
    }
  }
}
