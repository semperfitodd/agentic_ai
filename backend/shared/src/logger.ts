const REDACTED = '[REDACTED]';

const SENSITIVE_KEYS = new Set([
  'githubtoken',
  'github_token',
  'x-api-key',
  'x-api-key',
  'authorization',
  'apikey',
  'api_key',
  'password',
  'secret',
  'token',
]);

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEYS.has(key.toLowerCase())) {
    return REDACTED;
  }
  if (typeof value === 'object' && value !== null) {
    return redactObject(value as Record<string, unknown>);
  }
  return value;
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, redactValue(k, v)])
  );
}

function sanitize(data: unknown): unknown {
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      return data.map(item => sanitize(item));
    }
    return redactObject(data as Record<string, unknown>);
  }
  return data;
}

function format(level: string, message: string, meta?: unknown): string {
  const entry: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };
  if (meta !== undefined) {
    entry.meta = sanitize(meta);
  }
  return JSON.stringify(entry);
}

export const logger = {
  info: (message: string, meta?: unknown) => console.log(format('info', message, meta)),
  warn: (message: string, meta?: unknown) => console.warn(format('warn', message, meta)),
  error: (message: string, meta?: unknown) => console.error(format('error', message, meta)),
  debug: (message: string, meta?: unknown) => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(format('debug', message, meta));
    }
  },
};
