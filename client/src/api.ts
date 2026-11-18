import type { Book, NewBook, Status } from "./types";

export const API_URL = "http://localhost:3001/api";

/** An error with a message that can be shown to the user. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isErrorBody(value: unknown): value is { error: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { error?: unknown }).error === "string"
  );
}

/** Sends the request and throws an `ApiError` for network errors and for every status that is not 2xx. */
async function send(path: string, init: RequestInit = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, init);
  } catch {
    // fetch only rejects when there is no response at all: server down, CORS blocked, offline.
    throw new ApiError(
      "The server is not reachable. Is the API running on http://localhost:3001?"
    );
  }

  if (!response.ok) {
    let message = `The request failed (status ${response.status})`;
    try {
      const body: unknown = await response.json();
      if (isErrorBody(body)) {
        message = body.error;
      }
    } catch {
      // The body is not JSON: keep the generic message.
    }
    throw new ApiError(message, response.status);
  }

  return response;
}

function jsonBody(data: unknown): RequestInit {
  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

export type ListOptions = {
  status?: Status;
  limit?: number;
  offset?: number;
};

export async function listBooks({ status, limit, offset }: ListOptions = {}): Promise<Book[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (limit !== undefined) params.set("limit", String(limit));
  if (offset) params.set("offset", String(offset));
  const query = params.size > 0 ? `?${params}` : "";
  const response = await send(`/books${query}`);
  return (await response.json()) as Book[];
}

export async function createBook(
  input: Pick<NewBook, "title" | "author">
): Promise<Book> {
  const response = await send("/books", { method: "POST", ...jsonBody(input) });
  return (await response.json()) as Book;
}

export async function replaceBook(id: string, input: NewBook): Promise<Book> {
  const response = await send(`/books/${encodeURIComponent(id)}`, {
    method: "PUT",
    ...jsonBody(input),
  });
  return (await response.json()) as Book;
}

export async function deleteBook(id: string): Promise<void> {
  await send(`/books/${encodeURIComponent(id)}`, { method: "DELETE" });
}
