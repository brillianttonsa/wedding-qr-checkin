import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { type Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import * as XLSX from 'xlsx';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role';
import { normalizeTanzanianPhone } from '../common/phone';
import {
  InvitationsService,
  type IssuedInvitation,
} from './invitations.service';
import { RegisterGuestDto, ReissueInvitationDto } from './invitation.dto';

type UploadedGuestFile = { originalname: string; buffer: Buffer };

function cellToString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

@ApiTags('invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}
  @Post('register') register(@Body() dto: RegisterGuestDto) {
    return this.invitations.register(dto);
  }
  @Post('guest/:guestId/issue') issue(
    @Param('guestId', ParseUUIDPipe) guestId: string,
  ) {
    return this.invitations.issueForExistingGuest(guestId);
  }
  @Post('guest/:guestId/reissue') reissue(
    @Param('guestId', ParseUUIDPipe) guestId: string,
    @Body() dto: ReissueInvitationDto,
  ) {
    return this.invitations.reissue(guestId, dto.reason);
  }
  @Post('guest/:guestId/revoke') revoke(
    @Param('guestId', ParseUUIDPipe) guestId: string,
    @Body() dto: ReissueInvitationDto,
  ) {
    return this.invitations.revoke(guestId, dto.reason);
  }
  @Get(':id/qr') async qr(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.invitations.qrFile(id);
    response.type('png').attachment(file.fileName).send(file.content);
  }
  @Get(':id/card') async card(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.invitations.cardFile(id);
    response.type('png').attachment(file.fileName).send(file.content);
  }
  @Get('qr/all') async allQr(@Res() response: Response): Promise<void> {
    const files = await this.invitations.allQrFiles();
    response.attachment('wedding-qr-codes.zip').type('zip');
    const { ZipArchive } = await import('archiver');
    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on('error', (error) => response.destroy(error));
    archive.pipe(response);
    files.forEach((file) =>
      archive.append(file.content, { name: file.fileName }),
    );
    await archive.finalize();
  }
  @Post('import')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  async import(@UploadedFile() file?: UploadedGuestFile): Promise<{
    successful: IssuedInvitation[];
    failed: Array<{ row: number; error: string }>;
  }> {
    if (!file) throw new BadRequestException('A CSV or XLSX file is required');
    if (!/\.(csv|xlsx)$/i.test(file.originalname))
      throw new BadRequestException('Only .csv and .xlsx files are supported');
    const rows = this.readRows(file);
    if (rows.length > 1000)
      throw new BadRequestException(
        'A maximum of 1,000 rows may be imported at once',
      );
    const successful: IssuedInvitation[] = [];
    const failed: Array<{ row: number; error: string }> = [];
    const seen = new Set<string>();
    for (const [index, row] of rows.entries()) {
      try {
        const dto = plainToInstance(RegisterGuestDto, {
          fullName: cellToString(row.full_name ?? row.fullName),
          phoneNumber: cellToString(row.phone_number ?? row.phoneNumber),
        });
        const validationErrors = validateSync(dto, {
          whitelist: true,
          forbidNonWhitelisted: true,
        });
        if (validationErrors.length) {
          const messages = validationErrors.flatMap((validationError) =>
            Object.values(validationError.constraints ?? {}),
          );
          throw new BadRequestException(messages);
        }
        const normalizedPhone = normalizeTanzanianPhone(dto.phoneNumber);
        if (seen.has(normalizedPhone))
          throw new BadRequestException('Duplicate phone number in upload');
        successful.push(await this.invitations.register(dto));
        seen.add(normalizedPhone);
      } catch (error: unknown) {
        if (
          !(error instanceof BadRequestException) &&
          !(error instanceof ConflictException)
        )
          throw error;
        const response = error.getResponse();
        const message =
          typeof response === 'string'
            ? response
            : 'message' in response
              ? Array.isArray(response.message)
                ? response.message.join('; ')
                : String(response.message)
              : error.message;
        failed.push({ row: index + 2, error: message });
      }
    }
    return { successful, failed };
  }
  private readRows(file: UploadedGuestFile): Array<Record<string, unknown>> {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(file.buffer, { type: 'buffer', raw: false });
    } catch {
      throw new BadRequestException('The uploaded file could not be parsed');
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet)
      throw new BadRequestException('The uploaded file has no worksheet');
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });
    if (!rows.length)
      throw new BadRequestException('The uploaded file contains no guest rows');
    const first = rows[0];
    if (
      !('full_name' in first || 'fullName' in first) ||
      !('phone_number' in first || 'phoneNumber' in first)
    )
      throw new BadRequestException(
        'File must contain full_name and phone_number columns',
      );
    return rows;
  }
}
