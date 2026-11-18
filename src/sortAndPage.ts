import type { Book } from "./types";
import type { SortField } from "./validation";

type SortAndPage = {
  sort?: SortField;
  limit?: number;
  offset: number;
};

/**
 * Sorts and pages a list of books that the store already filtered.
 * This happens in the API layer because the `BooksStore` interface must not change.
 * Without `sort` the order of the store is kept; without `limit` all books from `offset` on are returned.
 */
export function sortAndPage(books: Book[], { sort, limit, offset }: SortAndPage): Book[] {
  const sorted =
    sort === "title"
      ? [...books].sort((a, b) =>
          a.title.localeCompare(b.title, "en", { sensitivity: "base" })
        )
      : books;

  return sorted.slice(offset, limit === undefined ? undefined : offset + limit);
}
