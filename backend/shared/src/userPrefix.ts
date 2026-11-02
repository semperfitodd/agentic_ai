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
      claims?: Record<string, string>;
      jwt?: { claims?: Record<string, string> };
    };
  };
}

export function jwtClaimsFromEvent(event: JwtAuthorizerContext): Record<string, string> | undefined {
  const authorizer = event.requestContext?.authorizer;
  if (!authorizer) return undefined;
  if (authorizer.claims && typeof authorizer.claims === 'object') {
    return authorizer.claims;
  }
  return authorizer.jwt?.claims;
}

export function ownerIdFromClaims(claims: Record<string, string> | undefined): string | undefined {
  if (!claims) return undefined;
  const email = typeof claims.email === 'string' ? claims.email.trim() : '';
  if (email) return email;
  const username = typeof claims.username === 'string' ? claims.username.trim() : '';
  return username || undefined;
}

export function cognitoUsernameFromClaims(claims: Record<string, string> | undefined): string | undefined {
  if (!claims) return undefined;
  const username = typeof claims.username === 'string' ? claims.username.trim() : '';
  return username || undefined;
}

export function callerUsernameFromEvent(event: JwtAuthorizerContext): string | undefined {
  return ownerIdFromClaims(jwtClaimsFromEvent(event));
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

export function requireCognitoUsername(event: JwtAuthorizerContext): string {
  const username = cognitoUsernameFromClaims(jwtClaimsFromEvent(event));
  if (!username) {
    throw new AppError('Missing authenticated user', 401);
  }
  return username;
}
