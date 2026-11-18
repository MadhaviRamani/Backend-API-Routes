import type { NextFunction, Request, Response } from "express";

/** Answers every request that no route handled. Mount it after all routes. */
export function notFound(_request: Request, response: Response): void {
  response.status(404).json({ error: "Not found" });
}

/** The fields `express.json()` (body-parser) sets on the errors it throws. */
type HttpError = {
  status?: unknown;
  statusCode?: unknown;
  type?: unknown;
};

function getClientErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const { status, statusCode } = error as HttpError;
  const code = typeof status === "number" ? status : statusCode;
  return typeof code === "number" && code >= 400 && code < 500 ? code : undefined;
}

/**
 * The last middleware in `app.ts`. Express recognizes it as an error handler
 * because it has four parameters, so all four must stay.
 * Never sends a stack trace or an internal message to the client.
 */
export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction
): void {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    (error as HttpError).type === "entity.parse.failed"
  ) {
    response.status(400).json({ error: "The body is not valid JSON" });
    return;
  }

  const clientStatus = getClientErrorStatus(error);
  if (clientStatus !== undefined) {
    response.status(clientStatus).json({ error: "Invalid request" });
    return;
  }

  // Log the details on the server only; the client gets a generic message.
  console.error(error);
  response.status(500).json({ error: "Internal server error" });
}
