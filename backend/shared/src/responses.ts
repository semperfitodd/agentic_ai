const getFrontendOrigin = () => process.env.FRONTEND_ORIGIN || '*';

export interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export function apiResponse(statusCode: number, body: unknown): ApiResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': getFrontendOrigin(),
    },
    body: JSON.stringify(body),
  };
}

export function apiTextResponse(statusCode: number, body: string, contentType = 'text/markdown'): ApiResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': getFrontendOrigin(),
    },
    body,
  };
}

export function stepResponse(statusCode: number, body: unknown): { statusCode: number; body: unknown } {
  return { statusCode, body };
}
