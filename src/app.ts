import express from "express";

import { errorHandler, notFound } from "./middleware/errors";
import { booksRouter } from "./routes/books";

export const app = express();

app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/api/books", booksRouter);

// After all routes: a route added below this is never reached.
app.use(notFound);
app.use(errorHandler);
