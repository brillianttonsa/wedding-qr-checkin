export function getPostgresErrorCode(error: unknown): string | undefined {
  const visited = new Set<object>();
  let current = error;

  while (
    typeof current === 'object' &&
    current !== null &&
    !visited.has(current)
  ) {
    visited.add(current);
    if ('code' in current && typeof current.code === 'string') {
      return current.code;
    }
    current = 'cause' in current ? current.cause : undefined;
  }

  return undefined;
}

export function isPostgresUniqueViolation(error: unknown): boolean {
  return getPostgresErrorCode(error) === '23505';
}
