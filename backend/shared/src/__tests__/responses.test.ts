import { apiResponse, apiTextResponse, stepResponse } from '../responses';

describe('responses', () => {
  it('apiResponse serializes body and sets headers', () => {
    const res = apiResponse(200, { ok: true });
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });

  it('apiResponse sets FRONTEND_ORIGIN from env', () => {
    process.env.FRONTEND_ORIGIN = 'https://example.com';
    const res = apiResponse(200, {});
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://example.com');
    delete process.env.FRONTEND_ORIGIN;
  });

  it('apiTextResponse returns raw body with correct content-type', () => {
    const res = apiTextResponse(200, '# Hello');
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('# Hello');
    expect(res.headers['Content-Type']).toBe('text/markdown');
  });

  it('stepResponse wraps statusCode and body', () => {
    const res = stepResponse(200, { key: 'value' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ key: 'value' });
  });
});
