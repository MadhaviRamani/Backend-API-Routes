import { useState, type FormEvent } from "react";

import { STATUS_LABELS } from "./books";
import type { StatusFilter } from "./types";
import { useBooks } from "./useBooks";

const FILTERS: StatusFilter[] = ["all", "want-to-read", "reading", "done"];

export default function App() {
  const {
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
  } = useBooks();
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
            onChange={(event) => changeStatus(event.target.value as StatusFilter)}
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
          {books.length === 0 && <p>No books.</p>}
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

      <nav aria-label="Pages">
        <button type="button" onClick={previousPage} disabled={loading || page === 0}>
          Previous
        </button>{" "}
        Page {page + 1}{" "}
        <button type="button" onClick={nextPage} disabled={loading || !hasNextPage}>
          Next
        </button>
      </nav>
    </main>
  );
}
