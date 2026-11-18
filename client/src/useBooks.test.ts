import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as api from "./api";
import type { Book } from "./types";
import { useBooks } from "./useBooks";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    listBooks: vi.fn(),
    createBook: vi.fn(),
    replaceBook: vi.fn(),
    deleteBook: vi.fn(),
  };
});

const mocked = vi.mocked(api);

const gone: Book = {
  id: "b3",
  title: "Gone Girl",
  author: "Gillian Flynn",
  status: "want-to-read",
  rating: null,
  notes: "Recommended by a friend.",
};

beforeEach(() => {
  vi.resetAllMocks();
  mocked.listBooks.mockResolvedValue([gone]);
});

describe("useBooks", () => {
  test("loads the books and stops loading", async () => {
    const { result } = renderHook(() => useBooks("all"));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.books).toEqual([gone]);
    expect(mocked.listBooks).toHaveBeenCalledWith(undefined);
  });

  test("sends the status filter to the API", async () => {
    const { result } = renderHook(() => useBooks("reading"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocked.listBooks).toHaveBeenCalledWith("reading");
  });

  test("shows the error message of the API when loading fails", async () => {
    mocked.listBooks.mockRejectedValue(new api.ApiError("status must be one of: x", 400));
    const { result } = renderHook(() => useBooks("all"));
    await waitFor(() => expect(result.current.loadError).toBe("status must be one of: x"));
  });

  test("adds a book and loads the list again", async () => {
    const { result } = renderHook(() => useBooks("all"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    mocked.createBook.mockResolvedValue({ ...gone, id: "new" });

    let ok = false;
    await act(async () => {
      ok = await result.current.addBook("Piranesi", "Susanna Clarke");
    });

    expect(ok).toBe(true);
    expect(mocked.createBook).toHaveBeenCalledWith({
      title: "Piranesi",
      author: "Susanna Clarke",
    });
    await waitFor(() => expect(mocked.listBooks).toHaveBeenCalledTimes(2));
  });

  test("marks a book as done with all its other fields", async () => {
    const { result } = renderHook(() => useBooks("all"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    mocked.replaceBook.mockResolvedValue({ ...gone, status: "done" });

    await act(async () => {
      await result.current.markDone(gone);
    });

    expect(mocked.replaceBook).toHaveBeenCalledWith("b3", {
      title: "Gone Girl",
      author: "Gillian Flynn",
      status: "done",
      rating: null,
      notes: "Recommended by a friend.",
    });
  });

  test("shows the error of a failed change and still reloads", async () => {
    const { result } = renderHook(() => useBooks("all"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    mocked.deleteBook.mockRejectedValue(new api.ApiError("Book not found", 404));

    let ok = true;
    await act(async () => {
      ok = await result.current.deleteBook("b3");
    });

    expect(ok).toBe(false);
    expect(result.current.actionError).toBe("Book not found");
    await waitFor(() => expect(mocked.listBooks).toHaveBeenCalledTimes(2));
  });
});
