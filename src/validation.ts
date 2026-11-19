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

function isRating(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5)
  );
}

export const EDITABLE_FIELDS = ["title", "author", "status", "rating", "notes"] as const;

/**
 * The rules for each editable field, in one place for POST, PUT and PATCH.
 * Checks only the fields that are present; the callers decide which fields are required.
 * Only the five editable fields are read, so unknown fields (and an `id`) are ignored.
 */
function parseFields(body: Record<string, unknown>): ValidationResult<Partial<NewBook>> {
  const { title, author, status, rating, notes } = body;
  const value: Partial<NewBook> = {};

  if (title !== undefined) {
    if (!isNonEmptyString(title)) {
      return { ok: false, error: "title is required and must be a non-empty string" };
    }
    value.title = title.trim();
  }

  if (author !== undefined) {
    if (!isNonEmptyString(author)) {
      return { ok: false, error: "author is required and must be a non-empty string" };
    }
    value.author = author.trim();
  }

  if (status !== undefined) {
    if (!isStatus(status)) {
      return { ok: false, error: `status must be one of: ${STATUSES.join(", ")}` };
    }
    value.status = status;
  }

  if (rating !== undefined) {
    if (!isRating(rating)) {
      return { ok: false, error: "rating must be null or an integer from 1 to 5" };
    }
    value.rating = rating;
  }

  if (notes !== undefined) {
    if (typeof notes !== "string") {
      return { ok: false, error: "notes must be a string" };
    }
    value.notes = notes;
  }

  return { ok: true, value };
}

/**
 * Validates the body of `POST /api/books` and `PUT /api/books/:id`:
 * `title` and `author` are required, the other fields get their defaults.
 */
export function parseBookInput(body: unknown): ValidationResult<NewBook> {
  if (!isPlainObject(body)) {
    return { ok: false, error: "The body must be a JSON object" };
  }

  const result = parseFields(body);
  if (!result.ok) {
    return result;
  }

  const { title, author, status, rating, notes } = result.value;
  if (title === undefined) {
    return { ok: false, error: "title is required and must be a non-empty string" };
  }
  if (author === undefined) {
    return { ok: false, error: "author is required and must be a non-empty string" };
  }

  return {
    ok: true,
    value: {
      title,
      author,
      status: status ?? "want-to-read",
      rating: rating ?? null,
      notes: notes ?? "",
    },
  };
}

/**
 * Validates the body of `PATCH /api/books/:id`: every field is optional,
 * but each field that is sent follows the same rules as for POST and PUT.
 * At least one editable field must be sent, otherwise the request would change nothing.
 */
export function parseBookPatch(body: unknown): ValidationResult<Partial<NewBook>> {
  if (!isPlainObject(body)) {
    return { ok: false, error: "The body must be a JSON object" };
  }

  const result = parseFields(body);
  if (!result.ok) {
    return result;
  }

  if (Object.keys(result.value).length === 0) {
    return {
      ok: false,
      error: `The body must contain at least one of: ${EDITABLE_FIELDS.join(", ")}`,
    };
  }

  return result;
}
