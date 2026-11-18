import type { BookFilter } from "./store/booksStore";
import { STATUSES, type NewBook, type Status } from "./types";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function isStatus(value: unknown): value is Status {
  return typeof value === "string" && STATUSES.includes(value as Status);
}

/** Validates the query of `GET /api/books`. Both `status` and `q` are optional. */
export function parseListQuery(query: unknown): ValidationResult<BookFilter> {
  const { status, q } = (query ?? {}) as Record<string, unknown>;
  const filter: BookFilter = {};

  if (status !== undefined) {
    if (!isStatus(status)) {
      return {
        ok: false,
        error: `status must be one of: ${STATUSES.join(", ")}`,
      };
    }
    filter.status = status;
  }

  if (q !== undefined) {
    if (typeof q !== "string") {
      return { ok: false, error: "q must be a single text value" };
    }
    filter.q = q;
  }

  return { ok: true, value: filter };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * Validates the body of `POST /api/books` and `PUT /api/books/:id`.
 * Only the five editable fields are read, so unknown fields (and an `id`) are ignored.
 */
export function parseBookInput(body: unknown): ValidationResult<NewBook> {
  if (!isPlainObject(body)) {
    return { ok: false, error: "The body must be a JSON object" };
  }

  const { title, author, status, rating, notes } = body;

  if (!isNonEmptyString(title)) {
    return { ok: false, error: "title is required and must be a non-empty string" };
  }

  if (!isNonEmptyString(author)) {
    return { ok: false, error: "author is required and must be a non-empty string" };
  }

  if (status !== undefined && !isStatus(status)) {
    return {
      ok: false,
      error: `status must be one of: ${STATUSES.join(", ")}`,
    };
  }

  if (
    rating !== undefined &&
    rating !== null &&
    !(typeof rating === "number" && Number.isInteger(rating) && rating >= 1 && rating <= 5)
  ) {
    return { ok: false, error: "rating must be null or an integer from 1 to 5" };
  }

  if (notes !== undefined && typeof notes !== "string") {
    return { ok: false, error: "notes must be a string" };
  }

  return {
    ok: true,
    value: {
      title: title.trim(),
      author: author.trim(),
      status: status ?? "want-to-read",
      rating: rating ?? null,
      notes: notes ?? "",
    },
  };
}
