import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly root: string;
  constructor(config: ConfigService) { this.root = resolve(config.getOrThrow<string>('STORAGE_DIR')); }
  async onModuleInit(): Promise<void> { await Promise.all(['qr-codes', 'invitation-cards', 'templates'].map((dir) => mkdir(join(this.root, dir), { recursive: true }))); }
  qrPath(fileName: string): string { return join(this.root, 'qr-codes', this.safeFileName(fileName)); }
  async removeQr(fileName: string): Promise<void> { await unlink(this.qrPath(fileName)).catch(() => undefined); }
  private safeFileName(fileName: string): string {
    if (!/^[a-zA-Z0-9_-]+\.png$/.test(fileName)) throw new Error('Unsafe storage file name');
    return fileName;
  }
}
