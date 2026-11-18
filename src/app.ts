import cors from "cors";
import express from "express";

import { errorHandler, notFound } from "./middleware/errors";
import { booksRouter } from "./routes/books";

/** Only the React app may call the API from a browser. Not `cors()` without options: that allows every origin. */
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";

export const app = express();

// First, so the CORS headers are also on error responses and the preflight (OPTIONS) is answered.
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/api/books", booksRouter);

// After all routes: a route added below this is never reached.
app.use(notFound);
app.use(errorHandler);
