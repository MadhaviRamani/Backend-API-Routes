import { useState, type FormEvent } from "react";

import { STATUS_LABELS } from "./books";
import type { StatusFilter } from "./types";
import { useBooks } from "./useBooks";

const FILTERS: StatusFilter[] = ["all", "want-to-read", "reading", "done"];

export default function App() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const { books, loading, loadError, actionError, addBook, markDone, deleteBook } =
    useBooks(status);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await addBook(title, author)) {
      setTitle("");
      setAuthor("");
    }
  }

  return (
    <main>
      <h1>Reading List</h1>

      <form onSubmit={handleSubmit}>
        <label>
          Title <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>{" "}
        <label>
          Author <input value={author} onChange={(event) => setAuthor(event.target.value)} />
        </label>{" "}
        <button type="submit">Add book</button>
      </form>

      <p>
        <label>
          Status{" "}
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
          >
            {FILTERS.map((filter) => (
              <option key={filter} value={filter}>
                {filter === "all" ? "All" : STATUS_LABELS[filter]}
              </option>
            ))}
          </select>
        </label>
      </p>

      {actionError && <p role="alert">{actionError}</p>}

      {loading ? (
        <p>Loading books…</p>
      ) : loadError ? (
        <p role="alert">{loadError}</p>
      ) : (
        <>
          <p>{books.length} books</p>
          <ul>
            {books.map((book) => (
              <li key={book.id}>
                {book.title} by {book.author} ({book.status}){" "}
                {book.status !== "done" && (
                  <button type="button" onClick={() => markDone(book)}>
                    Mark as done
                  </button>
                )}{" "}
                <button type="button" onClick={() => deleteBook(book.id)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
