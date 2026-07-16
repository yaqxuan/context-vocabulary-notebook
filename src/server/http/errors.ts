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

export class UnauthorizedError extends HttpError {
  constructor(message = 'Authentication required') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Access denied') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

export class UpgradeRequiredError extends HttpError {
  constructor(message = 'Sync protocol upgrade required') {
    super(426, message);
    this.name = 'UpgradeRequiredError';
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
