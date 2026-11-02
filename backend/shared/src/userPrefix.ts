import { AppError } from './errors';

export function validateOwnerId(ownerId: unknown): string {
  if (typeof ownerId !== 'string') {
    throw new AppError('ownerId is required', 400);
  }
  const trimmed = ownerId.trim();
  if (!trimmed) {
    throw new AppError('ownerId is required', 400);
  }
  if (trimmed.includes('/') || trimmed.includes('..')) {
    throw new AppError('Invalid ownerId', 400);
  }
  return trimmed;
}

export function userPrefix(ownerId: string): string {
  const id = validateOwnerId(ownerId);
  return `users/${id}/`;
}

export function assertOwnedKey(ownerId: string, key: string): void {
  const prefix = userPrefix(ownerId);
  if (!key.startsWith(prefix)) {
    throw new AppError('Access denied', 403);
  }
}

export interface JwtAuthorizerContext {
  requestContext?: {
    authorizer?: {
      jwt?: { claims?: Record<string, string> };
    };
  };
}

export function callerUsernameFromEvent(event: JwtAuthorizerContext): string | undefined {
  const raw = event.requestContext?.authorizer?.jwt?.claims?.username;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed || undefined;
}

export function requireCallerUsername(event: JwtAuthorizerContext): string {
  const username = callerUsernameFromEvent(event);
  if (!username) {
    throw new AppError('Missing authenticated user', 401);
  }
  try {
    return validateOwnerId(username);
  } catch {
    throw new AppError('Invalid authenticated user', 401);
  }
}
