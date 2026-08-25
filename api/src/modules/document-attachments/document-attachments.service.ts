import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { S3StorageService } from './s3-storage.service';
import { UploadAttachmentDto } from './dto/upload-attachment.dto';
import { UpdateAttachmentDto } from './dto/update-attachment.dto';

@Injectable()
export class DocumentAttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: S3StorageService,
  ) {}

  /**
   * Step 1: the client requests a presigned URL to upload directly to S3.
   * The DB row is not yet created; we return the storage key so the client can
   * call `confirm` once the upload completes.
   */
  async createUpload(
    documentId: string,
    dto: UploadAttachmentDto,
    uploadedById: string,
  ): Promise<unknown> {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');

    const storageKey = this.storage.buildKey(documentId, dto.fileName);
    const presigned = await this.storage.createPresignedUpload(storageKey, dto.mimeType);
    return {
      attachmentId: null,
      ...presigned,
      uploadedById,
    };
  }

  /**
   * Step 2: client confirms the upload completed. Creates the DB row.
   */
  async confirm(
    documentId: string,
    dto: UploadAttachmentDto & { storageKey: string },
    uploadedById: string,
  ): Promise<unknown> {
    return this.prisma.documentAttachment.create({
      data: {
        documentId,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        storageKey: dto.storageKey,
        uploadedById,
      },
    });
  }

  async findAll(documentId: string): Promise<unknown> {
    return this.prisma.documentAttachment.findMany({
      where: { documentId, status: 'uploaded' },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async getDownloadUrl(id: string): Promise<{ url: string; expiresIn: number; fileName: string }> {
    const att = await this.prisma.documentAttachment.findUnique({ where: { id } });
    if (!att || att.status !== 'uploaded') throw new NotFoundException('Attachment not found');
    const url = await this.storage.createPresignedDownload(att.storageKey, att.fileName);
    return { url, expiresIn: 900, fileName: att.fileName };
  }

  async update(id: string, dto: UpdateAttachmentDto): Promise<unknown> {
    return this.prisma.documentAttachment.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<{ success: true }> {
    const att = await this.prisma.documentAttachment.findUnique({ where: { id } });
    if (!att) throw new NotFoundException('Attachment not found');
    await this.storage.deleteObject(att.storageKey);
    await this.prisma.documentAttachment.update({
      where: { id },
      data: { status: 'deleted' },
    });
    return { success: true };
  }
}
