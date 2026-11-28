import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly root: string;
  constructor(config: ConfigService) {
    this.root = resolve(config.getOrThrow<string>('STORAGE_DIR'));
  }
  async onModuleInit(): Promise<void> {
    await Promise.all(
      ['qr-codes', 'invitation-cards', 'templates'].map((dir) =>
        mkdir(join(this.root, dir), { recursive: true }),
      ),
    );
  }
  qrPath(fileName: string): string {
    return join(this.root, 'qr-codes', this.safeFileName(fileName));
  }
  invitationCardPath(fileName: string): string {
    return join(
      this.root,
      'invitation-cards',
      this.safeFileName(fileName),
    );
  }
  templatePath(fileName: string): string {
    return join(this.root, 'templates', this.safeFileName(fileName));
  }
  async removeQr(fileName: string): Promise<void> {
    await this.removeFile(this.qrPath(fileName));
  }
  async removeInvitationCard(fileName: string): Promise<void> {
    await this.removeFile(this.invitationCardPath(fileName));
  }
  private async removeFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      )
        return;
      throw error;
    }
  }
  private safeFileName(fileName: string): string {
    if (!/^[\p{L}\p{M}\p{N}_-]+\.png$/u.test(fileName))
      throw new Error('Unsafe storage file name');
    return fileName;
  }
}
