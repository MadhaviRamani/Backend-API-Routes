import { useCallback, useEffect, useState } from "react";

import * as api from "./api";
import type { Book, StatusFilter } from "./types";

function toMessage(error: unknown): string {
  return error instanceof api.ApiError
    ? error.message
    : "Something went wrong. Please try again.";
}

/**
 * Loads the books from the API (filtered by status on the server) and offers the changes.
 * After every change the list is loaded again, so it always shows the state of the server.
 */
export function useBooks(status: StatusFilter) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // Ignore the answer of an older request, e.g. after a quick change of the filter.
    let ignore = false;
    setLoading(true);
    setLoadError(null);

    api
      .listBooks(status === "all" ? undefined : status)
      .then((result) => {
        if (!ignore) setBooks(result);
      })
      .catch((error: unknown) => {
        if (!ignore) setLoadError(toMessage(error));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [status, version]);

  /** Runs a change, shows its error, and reloads the list in every case. */
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

  return { books, loading, loadError, actionError, addBook, markDone, deleteBook };
}
