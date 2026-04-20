export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function toPublicError(err: unknown): { error: string } {
  if (err instanceof AppError) {
    return { error: err.message };
  }
  if (err instanceof Error) {
    return { error: err.message };
  }
  return { error: 'An unexpected error occurred' };
}
