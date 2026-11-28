export function qrFileNameForGuest(
  fullName: string,
  invitationId: string,
): string {
  const slug = Array.from(
    fullName
      .normalize('NFKC')
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, '_')
      .replace(/^_+|_+$/g, ''),
  )
    .slice(0, 80)
    .join('')
    .replace(/_+$/g, '');

  return `${slug || 'guest'}_${invitationId}.png`;
}
