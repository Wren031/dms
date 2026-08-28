import { registerAs } from '@nestjs/config';
import { resolve } from 'path';

export interface StorageConfig {
  uploadDir: string;
  maxFileSizeBytes: number;
}

export default registerAs<StorageConfig>('storage', () => ({
  uploadDir: process.env.UPLOAD_DIR
    ? resolve(process.env.UPLOAD_DIR)
    : resolve(process.cwd(), 'uploads'),
  maxFileSizeBytes: parseInt(process.env.MAX_UPLOAD_SIZE ?? '26214400', 10), // 25 MB
}));
