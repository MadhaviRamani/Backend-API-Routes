import { afterEach, describe, expect, test, vi } from "vitest";

import { API_URL, ApiError, createBook, deleteBook, listBooks, replaceBook } from "./api";
import type { Book } from "./types";

const book: Book = {
  id: "b1",
  title: "Dune",
  author: "Frank Herbert",
  status: "done",
  rating: 5,
  notes: "",
};

function mockFetch(response: Response | Error) {
  const fetchMock = vi.fn<typeof fetch>(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response)
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api", () => {
  test("listBooks loads all books", async () => {
    const fetchMock = mockFetch(json([book]));
    await expect(listBooks()).resolves.toEqual([book]);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/books`, {});
  });

  test("listBooks sends the status filter", async () => {
    const fetchMock = mockFetch(json([]));
    await listBooks("reading");
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_URL}/books?status=reading`);
  });

  test("createBook sends a JSON POST", async () => {
    const fetchMock = mockFetch(json(book, 201));
    await createBook({ title: "Dune", author: "Frank Herbert" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/books`);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(String(init?.body))).toEqual({
      title: "Dune",
      author: "Frank Herbert",
    });
  });

  test("replaceBook sends a PUT to the book", async () => {
    const fetchMock = mockFetch(json(book));
    const { id, ...fields } = book;
    await replaceBook(id, fields);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/books/b1`);
    expect(init?.method).toBe("PUT");
  });

  test("deleteBook accepts 204 without a body", async () => {
    const fetchMock = mockFetch(new Response(null, { status: 204 }));
    await expect(deleteBook("b1")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  });

  test("throws the error message of the API", async () => {
    mockFetch(json({ error: "Book not found" }, 404));
    const promise = deleteBook("nope");
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({
      message: "Book not found",
      status: 404,
    });
  });

  test("throws a generic message when the error body is not JSON", async () => {
    mockFetch(new Response("<html>oops</html>", { status: 500 }));
    await expect(listBooks()).rejects.toThrow("The request failed (status 500)");
  });

  test("throws a clear message when the server is not reachable", async () => {
    mockFetch(new TypeError("Failed to fetch"));
    await expect(listBooks()).rejects.toThrow("The server is not reachable");
  });
});
