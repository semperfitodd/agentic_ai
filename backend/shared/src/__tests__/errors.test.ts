import { AppError, toPublicError } from '../errors';

describe('AppError', () => {
  it('constructs with message and status', () => {
    const err = new AppError('not found', 404);
    expect(err.message).toBe('not found');
    expect(err.statusCode).toBe(404);
    expect(err.name).toBe('AppError');
  });

  it('defaults status to 500', () => {
    const err = new AppError('oops');
    expect(err.statusCode).toBe(500);
  });
});

describe('toPublicError', () => {
  it('uses AppError message', () => {
    expect(toPublicError(new AppError('bad input', 400))).toEqual({ error: 'bad input' });
  });

  it('uses Error message', () => {
    expect(toPublicError(new Error('something broke'))).toEqual({ error: 'something broke' });
  });

  it('returns generic message for unknown types', () => {
    expect(toPublicError('string error')).toEqual({ error: 'An unexpected error occurred' });
  });
});
