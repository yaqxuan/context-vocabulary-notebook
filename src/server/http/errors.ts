// Typed HTTP error classes and JSON error response helper

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string, fields?: Record<string, string>) {
    super(400, message, fields);
    this.name = 'BadRequestError';
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends HttpError {
  constructor(message: string) {
    super(409, message);
    this.name = 'ConflictError';
  }
}

export interface ApiErrorBody {
  error: string;
  message: string;
  fields?: Record<string, string>;
}

export function makeErrorBody(err: HttpError): ApiErrorBody {
  const body: ApiErrorBody = { error: err.message, message: err.message };
  if (err.fields) body.fields = err.fields;
  return body;
}
