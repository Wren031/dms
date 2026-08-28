import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { createWriteStream } from 'fs';
import { mkdir, unlink } from 'fs/promises';
import { dirname, join, normalize, relative, sep } from 'path';
import { StorageConfig } from '../../config/storage.config';

@Injectable()
export class LocalStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;

  constructor(configService: ConfigService) {
    const cfg = configService.getOrThrow<StorageConfig>('storage');
    this.uploadDir = cfg.uploadDir;
    void mkdir(this.uploadDir, { recursive: true });
  }

  buildStorageKey(documentId: string, originalName: string): string {
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `documents/${documentId}/${randomUUID()}-${safeName}`;
  }

  getAbsolutePath(storageKey: string): string {
    const normalized = normalize(storageKey);
    const rel = relative(this.uploadDir, join(this.uploadDir, normalized));
    if (rel.startsWith('..') || (rel.startsWith(sep) && !rel.startsWith(`${sep}${sep}`))) {
      throw new Error('Illegal storage key');
    }
    return join(this.uploadDir, normalized);
  }

  async save(buffer: Buffer, storageKey: string): Promise<void> {
    const absolutePath = this.getAbsolutePath(storageKey);
    await mkdir(dirname(absolutePath), { recursive: true });
    await new Promise<void>((resolve, reject) => {
      const out = createWriteStream(absolutePath);
      out.on('error', reject);
      out.on('close', resolve);
      out.end(buffer);
    });
  }

  async remove(storageKey: string): Promise<void> {
    try {
      await unlink(this.getAbsolutePath(storageKey));
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        this.logger.warn(`Failed to delete ${storageKey}: ${String(err)}`);
      }
    }
  }
}
