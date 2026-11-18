import { Router } from "express";

import { booksStore } from "../store/booksStore";
import { parseBookInput, parseListQuery } from "../validation";

export const booksRouter = Router();

booksRouter.get("/", async (request, response) => {
  const result = parseListQuery(request.query);
  if (!result.ok) {
    response.status(400).json({ error: result.error });
    return;
  }

  response.json(await booksStore.list(result.value));
});

booksRouter.post("/", async (request, response) => {
  const result = parseBookInput(request.body);
  if (!result.ok) {
    response.status(400).json({ error: result.error });
    return;
  }

  response.status(201).json(await booksStore.create(result.value));
});

// Must come before "/:id", otherwise "count" is read as an id.
booksRouter.get("/count", async (_request, response) => {
  response.json({ count: await booksStore.count() });
});

booksRouter.get("/:id", async (request, response) => {
  const book = await booksStore.get(request.params.id);
  if (!book) {
    response.status(404).json({ error: "Book not found" });
    return;
  }

  response.json(book);
});

booksRouter.put("/:id", async (request, response) => {
  // Validate first, so an invalid body never changes the book.
  const result = parseBookInput(request.body);
  if (!result.ok) {
    response.status(400).json({ error: result.error });
    return;
  }

  // The id comes from the path only; an id in the body was already dropped by the validation.
  const book = await booksStore.replace(request.params.id, result.value);
  if (!book) {
    response.status(404).json({ error: "Book not found" });
    return;
  }

  response.json(book);
});

booksRouter.delete("/:id", async (request, response) => {
  const removed = await booksStore.remove(request.params.id);
  if (!removed) {
    response.status(404).json({ error: "Book not found" });
    return;
  }

  response.status(204).end();
});
