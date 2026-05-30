import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { HttpError, makeErrorBody } from './errors.js';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Wraps an async route handler so that any thrown error is forwarded to
 * Express's next() error pipeline. HttpError instances are serialised to
 * their status code; unexpected errors become 500.
 */
export function asyncRoute(handler: AsyncRouteHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch((err: unknown) => {
      if (err instanceof HttpError) {
        res.status(err.status).json(makeErrorBody(err));
      } else {
        next(err);
      }
    });
  };
}
