import { describe, it, expect } from 'vitest';

import { AppError } from '../errors';
import {
  assertOwnedKey,
  callerUsernameFromEvent,
  cognitoUsernameFromClaims,
  jwtClaimsFromEvent,
  ownerIdFromClaims,
  requireCognitoUsername,
  userPrefix,
  validateOwnerId,
} from '../userPrefix';

describe('validateOwnerId', () => {
  it('accepts email usernames', () => {
    expect(validateOwnerId('todd@bernsonfamily.com')).toBe('todd@bernsonfamily.com');
  });

  it('trims whitespace', () => {
    expect(validateOwnerId('  user@example.com  ')).toBe('user@example.com');
  });

  it('rejects path separators and traversal', () => {
    expect(() => validateOwnerId('a/b')).toThrow(AppError);
    expect(() => validateOwnerId('..')).toThrow(AppError);
    expect(() => validateOwnerId('user@x.com/evil')).toThrow(AppError);
  });

  it('rejects empty values', () => {
    expect(() => validateOwnerId('')).toThrow(AppError);
    expect(() => validateOwnerId('   ')).toThrow(AppError);
  });
});

describe('userPrefix', () => {
  it('builds users/email/ prefix', () => {
    expect(userPrefix('todd@bscanalytics.com')).toBe('users/todd@bscanalytics.com/');
  });
});

describe('jwtClaimsFromEvent', () => {
  it('reads payload 1.0 authorizer.claims', () => {
    const event = {
      requestContext: {
        authorizer: {
          claims: { email: 'todd@example.com', username: 'Google_123' },
        },
      },
    };
    expect(jwtClaimsFromEvent(event)).toEqual({ email: 'todd@example.com', username: 'Google_123' });
  });

  it('reads payload 2.0 authorizer.jwt.claims', () => {
    const event = {
      requestContext: {
        authorizer: {
          jwt: { claims: { username: 'todd@example.com' } },
        },
      },
    };
    expect(jwtClaimsFromEvent(event)?.username).toBe('todd@example.com');
  });
});

describe('ownerIdFromClaims', () => {
  it('prefers email over federated username', () => {
    expect(ownerIdFromClaims({ email: 'todd@b.com', username: 'Google_abc' })).toBe('todd@b.com');
  });

  it('falls back to username when email is absent', () => {
    expect(ownerIdFromClaims({ username: 'todd@example.com' })).toBe('todd@example.com');
  });
});

describe('callerUsernameFromEvent', () => {
  it('resolves owner from payload 1.0 email claim only', () => {
    const event = {
      requestContext: {
        authorizer: {
          claims: { email: 'todd@bernsonfamily.com', username: 'Google_xyz' },
        },
      },
    };
    expect(callerUsernameFromEvent(event)).toBe('todd@bernsonfamily.com');
  });
});

describe('requireCognitoUsername', () => {
  it('uses Cognito username, not email, for AdminDeleteUser', () => {
    const event = {
      requestContext: {
        authorizer: {
          claims: { email: 'todd@b.com', username: 'Google_12345' },
        },
      },
    };
    expect(requireCognitoUsername(event)).toBe('Google_12345');
    expect(cognitoUsernameFromClaims(jwtClaimsFromEvent(event))).toBe('Google_12345');
  });
});

describe('assertOwnedKey', () => {
  const owner = 'todd@bernsonfamily.com';

  it('allows keys under the user prefix', () => {
    expect(() => assertOwnedKey(owner, 'users/todd@bernsonfamily.com/reports/x.md')).not.toThrow();
  });

  it('denies another user prefix', () => {
    expect(() => assertOwnedKey(owner, 'users/other@example.com/reports/x.md')).toThrow(AppError);
    try {
      assertOwnedKey(owner, 'reports/legacy/x.md');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).statusCode).toBe(403);
    }
  });
});
