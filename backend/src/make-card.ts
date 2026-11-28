import 'dotenv/config';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const NAME_START_X = 0.4606;
const NAME_BASELINE_Y = 0.1833;
const NAME_MAX_RIGHT_X = 0.84;
const NAME_SIZE = 0.0483;
const NAME_MIN_SIZE = 0.03;

const QR_CENTER_X = 0.5;
const QR_TOP_Y = 0.756;
const QR_SIZE = 0.15;
const QR_PADDING = 0.0102;
const QR_BACKGROUND = '#ffffff';
const NAME_COLOR = '#3e548a';

function roundedRectPath(
  ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

export async function makeCard(
  fullName: string,
  templatePng: Buffer,
  qrPng: Buffer,
): Promise<Buffer> {
  const [template, qrImage] = await Promise.all([
    loadImage(templatePng),
    loadImage(qrPng),
  ]);
  const width = template.width;
  const height = template.height;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(template, 0, 0);

  const displayName = fullName.trim().replace(/\s+/g, ' ');
  const startX = NAME_START_X * width;
  const maxWidth = (NAME_MAX_RIGHT_X - NAME_START_X) * width;
  let fontSize = Math.round(NAME_SIZE * width);
  const minFontSize = Math.round(NAME_MIN_SIZE * width);

  ctx.font = `${fontSize}px cursive`;
  while (ctx.measureText(displayName).width > maxWidth && fontSize > minFontSize) {
    fontSize -= 1;
    ctx.font = `${fontSize}px cursive`;
  }
  if (ctx.measureText(displayName).width > maxWidth) {
    throw new Error('Guest name is too long to fit on the invitation card');
  }

  ctx.fillStyle = NAME_COLOR;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(displayName, startX, NAME_BASELINE_Y * height);

  const qrSize = Math.round(QR_SIZE * width);
  const padding = Math.round(QR_PADDING * width);
  const boxSize = qrSize + padding * 2;
  const boxX = Math.round(QR_CENTER_X * width - boxSize / 2);
  const boxY = Math.round(QR_TOP_Y * height);

  ctx.fillStyle = QR_BACKGROUND;
  roundedRectPath(ctx, boxX, boxY, boxSize, boxSize, Math.round(boxSize * 0.1));
  ctx.fill();

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrImage, boxX + padding, boxY + padding, qrSize, qrSize);
  return canvas.toBuffer('image/png');
}

async function main(): Promise<void> {
  const [fullName, qrFileName] = process.argv.slice(2);
  if (!fullName || !qrFileName || !/^[\p{L}\p{M}\p{N}_-]+\.png$/u.test(qrFileName)) {
    throw new Error(
      'Usage: npx ts-node src/make-card.ts "<guest full name>" "<existing-qr-file.png>"',
    );
  }

  const storageRoot = resolve(process.env.STORAGE_DIR ?? './storage');
  const templatePath = join(storageRoot, 'templates', 'card_template.png');
  const qrPath = join(storageRoot, 'qr-codes', qrFileName);
  const cardPath = join(storageRoot, 'invitation-cards', qrFileName);
  const [templatePng, qrPng] = await Promise.all([
    readFile(templatePath),
    readFile(qrPath),
  ]);
  const cardPng = await makeCard(fullName, templatePng, qrPng);
  await mkdir(join(storageRoot, 'invitation-cards'), { recursive: true });
  await writeFile(cardPath, cardPng);
  console.log(`Card saved: ${cardPath}`);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
