import { useCallback, useEffect, useState } from "react";

import * as api from "./api";
import type { Book, StatusFilter } from "./types";

export const PAGE_SIZE = 5;

function toMessage(error: unknown): string {
  return error instanceof api.ApiError
    ? error.message
    : "Something went wrong. Please try again.";
}

/**
 * Loads one page of books from the API (filtered by status on the server) and offers the changes.
 * After every change the page is loaded again, so it always shows the state of the server.
 */
export function useBooks() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const [books, setBooks] = useState<Book[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // Ignore the answer of an older request, e.g. after a quick change of the filter or page.
    let ignore = false;
    setLoading(true);
    setLoadError(null);

    api
      // One book more than a page: if it comes back, there is a next page.
      .listBooks({
        status: status === "all" ? undefined : status,
        limit: PAGE_SIZE + 1,
        offset: page * PAGE_SIZE,
      })
      .then((result) => {
        if (ignore) return;
        if (result.length === 0 && page > 0) {
          // The page became empty (e.g. its last book was deleted): go back one page.
          setPage(page - 1);
          return;
        }
        setBooks(result.slice(0, PAGE_SIZE));
        setHasNextPage(result.length > PAGE_SIZE);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (ignore) return;
        setLoadError(toMessage(error));
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [status, page, version]);

  /** Changes the filter and starts again at the first page. */
  const changeStatus = (next: StatusFilter) => {
    setStatus(next);
    setPage(0);
  };

  const nextPage = () => setPage((current) => current + 1);
  const previousPage = () => setPage((current) => Math.max(0, current - 1));

  /** Runs a change, shows its error, and reloads the page in every case. */
  const run = useCallback(async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
      return true;
    } catch (error) {
      setActionError(toMessage(error));
      return false;
    } finally {
      setVersion((current) => current + 1);
    }
  }, []);

  const addBook = (title: string, author: string) =>
    run(() => api.createBook({ title, author }));

  const markDone = ({ id, ...fields }: Book) =>
    run(() => api.replaceBook(id, { ...fields, status: "done" }));

  const deleteBook = (id: string) => run(() => api.deleteBook(id));

  return {
    status,
    changeStatus,
    page,
    hasNextPage,
    nextPage,
    previousPage,
    books,
    loading,
    loadError,
    actionError,
    addBook,
    markDone,
    deleteBook,
  };
}
