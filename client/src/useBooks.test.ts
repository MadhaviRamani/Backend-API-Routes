import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as api from "./api";
import type { Book } from "./types";
import { PAGE_SIZE, useBooks } from "./useBooks";

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

function makeBooks(count: number): Book[] {
  return Array.from({ length: count }, (_, index) => ({
    ...gone,
    id: `id${index}`,
    title: `Book ${index}`,
  }));
}

async function renderLoaded() {
  const hook = renderHook(() => useBooks());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocked.listBooks.mockResolvedValue([gone]);
});

describe("useBooks", () => {
  test("loads the first page and asks for one book more than a page", async () => {
    const { result } = renderHook(() => useBooks());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.books).toEqual([gone]);
    expect(mocked.listBooks).toHaveBeenCalledWith({
      status: undefined,
      limit: PAGE_SIZE + 1,
      offset: 0,
    });
  });

  test("has no next page when the extra book does not come back", async () => {
    mocked.listBooks.mockResolvedValue(makeBooks(PAGE_SIZE));
    const { result } = await renderLoaded();
    expect(result.current.books).toHaveLength(PAGE_SIZE);
    expect(result.current.hasNextPage).toBe(false);
  });

  test("has a next page when the extra book comes back, and does not show it", async () => {
    mocked.listBooks.mockResolvedValue(makeBooks(PAGE_SIZE + 1));
    const { result } = await renderLoaded();
    expect(result.current.books).toHaveLength(PAGE_SIZE);
    expect(result.current.hasNextPage).toBe(true);
  });

  test("goes to the next and the previous page", async () => {
    const { result } = await renderLoaded();

    act(() => result.current.nextPage());
    await waitFor(() =>
      expect(mocked.listBooks).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: PAGE_SIZE })
      )
    );
    expect(result.current.page).toBe(1);

    act(() => result.current.previousPage());
    await waitFor(() =>
      expect(mocked.listBooks).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 0 })
      )
    );
    expect(result.current.page).toBe(0);
  });

  test("a new status filter starts again at the first page", async () => {
    const { result } = await renderLoaded();
    act(() => result.current.nextPage());
    await waitFor(() => expect(result.current.page).toBe(1));

    act(() => result.current.changeStatus("reading"));

    await waitFor(() =>
      expect(mocked.listBooks).toHaveBeenLastCalledWith({
        status: "reading",
        limit: PAGE_SIZE + 1,
        offset: 0,
      })
    );
    expect(result.current.page).toBe(0);
  });

  test("goes back one page when the page became empty", async () => {
    const { result } = await renderLoaded();
    // Page 2 is empty, page 1 has a book.
    mocked.listBooks.mockImplementation(async ({ offset } = {}) =>
      offset ? [] : [gone]
    );

    act(() => result.current.nextPage());

    await waitFor(() => expect(result.current.page).toBe(0));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.books).toEqual([gone]);
  });

  test("shows the error message of the API when loading fails", async () => {
    mocked.listBooks.mockRejectedValue(new api.ApiError("limit must be a whole number", 400));
    const { result } = renderHook(() => useBooks());
    await waitFor(() => expect(result.current.loadError).toBe("limit must be a whole number"));
    expect(result.current.loading).toBe(false);
  });

  test("adds a book and loads the page again", async () => {
    const { result } = await renderLoaded();
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
    const { result } = await renderLoaded();
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
    const { result } = await renderLoaded();
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
