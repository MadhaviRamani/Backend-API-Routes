import { describe, expect, it } from "vitest";

import { sortAndPage } from "./sortAndPage";
import type { Book } from "./types";

function book(id: string, title: string): Book {
  return { id, title, author: "A", status: "want-to-read", rating: null, notes: "" };
}

const books = [book("1", "dune"), book("2", "Anathem"), book("3", "Brave New World")];

const titles = (list: Book[]) => list.map((item) => item.title);

describe("sortAndPage", () => {
  it("keeps the order of the store without options", () => {
    expect(sortAndPage(books, { offset: 0 })).toEqual(books);
  });

  it("sorts by title, ignoring upper and lower case", () => {
    expect(titles(sortAndPage(books, { sort: "title", offset: 0 }))).toEqual([
      "Anathem",
      "Brave New World",
      "dune",
    ]);
  });

  it("does not change the input list", () => {
    const input = [...books];
    sortAndPage(input, { sort: "title", offset: 0 });
    expect(input).toEqual(books);
  });

  it("returns at most limit books", () => {
    expect(titles(sortAndPage(books, { limit: 2, offset: 0 }))).toEqual(["dune", "Anathem"]);
  });

  it("skips offset books", () => {
    expect(titles(sortAndPage(books, { offset: 1 }))).toEqual(["Anathem", "Brave New World"]);
  });

  it("sorts before it pages", () => {
    expect(titles(sortAndPage(books, { sort: "title", limit: 1, offset: 1 }))).toEqual([
      "Brave New World",
    ]);
  });

  it("returns an empty list when offset is past the end", () => {
    expect(sortAndPage(books, { limit: 5, offset: 10 })).toEqual([]);
  });
});
