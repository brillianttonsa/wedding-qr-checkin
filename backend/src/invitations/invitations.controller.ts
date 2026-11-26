import { BadRequestException, Body, Controller, Get, Header, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { type Response } from 'express';
import archiver from 'archiver';
import * as XLSX from 'xlsx';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; import { RolesGuard } from '../auth/roles.guard'; import { Roles } from '../auth/roles.decorator'; import { UserRole } from '../auth/user-role';
import { InvitationsService } from './invitations.service'; import { RegisterGuestDto, ReissueInvitationDto } from './invitation.dto';

@ApiTags('invitations') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}
  @Post('register') register(@Body() dto: RegisterGuestDto) { return this.invitations.register(dto); }
  @Post('guest/:guestId/issue') issue(@Param('guestId') guestId: string) { return this.invitations.issueForExistingGuest(guestId); }
  @Post('guest/:guestId/reissue') reissue(@Param('guestId') guestId: string, @Body() _: ReissueInvitationDto) { return this.invitations.reissue(guestId); }
  @Get(':id/qr') async qr(@Param('id') id: string, @Res() response: Response): Promise<void> {
    const file = await this.invitations.qrFile(id); response.type('png').attachment(file.fileName).send(file.content);
  }
  @Get('qr/all') async allQr(@Res() response: Response): Promise<void> {
    const files = await this.invitations.allQrFiles(); response.attachment('wedding-qr-codes.zip').type('zip');
    const archive = archiver('zip', { zlib: { level: 9 } }); archive.on('error', (error) => { throw error; }); archive.pipe(response);
    files.forEach((file) => archive.append(file.content, { name: file.fileName })); await archive.finalize();
  }
  @Post('import') @ApiConsumes('multipart/form-data') @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  async import(@UploadedFile() file?: Express.Multer.File): Promise<{ successful: Array<unknown>; failed: Array<{ row: number; error: string }> }> {
    if (!file) throw new BadRequestException('A CSV or XLSX file is required');
    if (!/\.(csv|xlsx)$/i.test(file.originalname)) throw new BadRequestException('Only .csv and .xlsx files are supported');
    const rows = this.readRows(file); if (rows.length > 1000) throw new BadRequestException('A maximum of 1,000 rows may be imported at once');
    const successful: Array<unknown> = []; const failed: Array<{ row: number; error: string }> = []; const seen = new Set<string>();
    for (const [index, row] of rows.entries()) {
      try {
        const fullName = String(row.full_name ?? row.fullName ?? '').trim(); const phoneNumber = String(row.phone_number ?? row.phoneNumber ?? '').trim();
        const normalized = phoneNumber.replace(/[\s()-]/g, ''); if (seen.has(normalized)) throw new Error('Duplicate phone number in upload'); seen.add(normalized);
        successful.push(await this.invitations.register({ fullName, phoneNumber }));
      } catch (error: unknown) { failed.push({ row: index + 2, error: error instanceof Error ? error.message : 'Invalid row' }); }
    }
    return { successful, failed };
  }
  private readRows(file: Express.Multer.File): Array<Record<string, unknown>> {
    const workbook = XLSX.read(file.buffer, { type: 'buffer', raw: false }); const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new BadRequestException('The uploaded file has no worksheet');
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    if (!rows.length) throw new BadRequestException('The uploaded file contains no guest rows');
    const first = rows[0]; if (!('full_name' in first || 'fullName' in first) || !('phone_number' in first || 'phoneNumber' in first)) throw new BadRequestException('File must contain full_name and phone_number columns');
    return rows;
  }
}
