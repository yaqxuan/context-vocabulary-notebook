export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export type QueryValue = string | number | boolean | null | undefined;

export function buildQuery(params: Record<string, QueryValue>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    searchParams.set(key, String(value));
  }
  return searchParams.toString();
}

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  json?: unknown;
  body?: BodyInit | null;
}

function apiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) throw new Error('Absolute API URLs are not allowed');
  if (path.startsWith('/api/')) return path;
  if (path === '/api') return path;
  return `/api${path.startsWith('/') ? path : `/${path}`}`;
}

function isJsonResponse(response: Response): boolean {
  return response.headers.get('Content-Type')?.includes('application/json') ?? false;
}

async function parseError(response: Response): Promise<ApiError> {
  if (isJsonResponse(response)) {
    const payload = await response.json().catch(() => null) as { error?: unknown; message?: unknown; details?: unknown } | null;
    const message = typeof payload?.error === 'string'
      ? payload.error
      : typeof payload?.message === 'string'
        ? payload.message
        : response.statusText || 'Request failed';
    return new ApiError(response.status, message, payload?.details);
  }

  const text = await response.text().catch(() => '');
  return new ApiError(response.status, text || response.statusText || 'Request failed');
}

function headersObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export async function apiRequest<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { json, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  let body = requestOptions.body;
  if (json !== undefined) {
    body = JSON.stringify(json);
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(apiUrl(path), { ...requestOptions, headers: headersObject(headers), body });
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  if (isJsonResponse(response)) return await response.json() as T;
  return await response.text() as T;
}

export async function apiBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const headers = new Headers(options.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/zip, application/octet-stream');
  const response = await fetch(apiUrl(path), { ...options, headers: headersObject(headers) });
  if (!response.ok) throw await parseError(response);
  return await response.blob();
}

export async function apiFormData<T = unknown>(path: string, formData: FormData, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  const response = await fetch(apiUrl(path), {
    ...options,
    method: options.method ?? 'POST',
    headers: headersObject(headers),
    body: formData,
  });
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  if (isJsonResponse(response)) return await response.json() as T;
  return await response.text() as T;
}
