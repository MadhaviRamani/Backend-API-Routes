import type { BookFilter } from "./store/booksStore";
import { STATUSES, type NewBook, type Status } from "./types";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function isStatus(value: unknown): value is Status {
  return typeof value === "string" && STATUSES.includes(value as Status);
}

export const SORT_FIELDS = ["title"] as const;
export type SortField = (typeof SORT_FIELDS)[number];

/** The largest page `?limit=` may ask for. */
export const MAX_LIMIT = 100;

export type ListQuery = {
  filter: BookFilter;
  sort?: SortField;
  limit?: number;
  offset: number;
};

function isSortField(value: unknown): value is SortField {
  return typeof value === "string" && SORT_FIELDS.includes(value as SortField);
}

/**
 * Parses a whole number from a query value. Only digits are allowed, so "abc", "", "-1",
 * "1.5", "1e2", " 5" and a repeated parameter (an array) are all rejected.
 */
function parseWholeNumber(value: unknown): number | undefined {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return undefined;
  }
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : undefined;
}

/**
 * Validates the query of `GET /api/books`. All parameters are optional:
 * `status`, `q` (filters), `sort=title`, `limit` (1 to MAX_LIMIT) and `offset` (0 or more).
 */
export function parseListQuery(query: unknown): ValidationResult<ListQuery> {
  const { status, q, sort, limit, offset } = (query ?? {}) as Record<string, unknown>;
  const filter: BookFilter = {};
  const result: ListQuery = { filter, offset: 0 };

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

  if (sort !== undefined) {
    if (!isSortField(sort)) {
      return { ok: false, error: `sort must be one of: ${SORT_FIELDS.join(", ")}` };
    }
    result.sort = sort;
  }

  if (limit !== undefined) {
    const parsed = parseWholeNumber(limit);
    if (parsed === undefined || parsed < 1 || parsed > MAX_LIMIT) {
      return {
        ok: false,
        error: `limit must be a whole number from 1 to ${MAX_LIMIT}`,
      };
    }
    result.limit = parsed;
  }

  if (offset !== undefined) {
    const parsed = parseWholeNumber(offset);
    if (parsed === undefined) {
      return { ok: false, error: "offset must be a whole number of 0 or more" };
    }
    result.offset = parsed;
  }

  return { ok: true, value: result };
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
