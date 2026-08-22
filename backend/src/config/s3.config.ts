import { registerAs } from '@nestjs/config';

export interface S3Config {
  endpoint: string | undefined;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  forcePathStyle: boolean;
  presignExpires: number;
}

export default registerAs<S3Config>('s3', () => ({
  endpoint: process.env.S3_ENDPOINT || undefined,
  region: process.env.S3_REGION ?? 'ap-southeast-1',
  bucket: process.env.S3_BUCKET ?? 'dms-attachments',
  accessKey: process.env.S3_ACCESS_KEY ?? '',
  secretKey: process.env.S3_SECRET_KEY ?? '',
  forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true').toLowerCase() === 'true',
  presignExpires: parseInt(process.env.S3_PRESIGN_EXPIRES ?? '900', 10),
}));
