import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import App from "./App";
import * as api from "./api";
import seed from "./seed.json";
import type { Book } from "./types";

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
const books = seed as Book[];

beforeEach(() => {
  vi.resetAllMocks();
  mocked.listBooks.mockResolvedValue(books);
});

test("shows a loading text, then the heading and all books from the API", async () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: "Reading List" })).toBeInTheDocument();
  expect(screen.getByText("Loading books…")).toBeInTheDocument();
  expect(await screen.findAllByRole("listitem")).toHaveLength(10);
});

test("shows an error when the server is not reachable", async () => {
  mocked.listBooks.mockRejectedValue(new api.ApiError("The server is not reachable."));
  render(<App />);
  expect(await screen.findByRole("alert")).toHaveTextContent("The server is not reachable.");
});

test("the status filter asks the API for that status", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findAllByRole("listitem");

  await user.selectOptions(screen.getByLabelText("Status"), "reading");

  expect(mocked.listBooks).toHaveBeenLastCalledWith("reading");
});

test("adds a book and clears the form", async () => {
  const user = userEvent.setup();
  mocked.createBook.mockResolvedValue({ ...books[0], id: "new" });
  render(<App />);
  await screen.findAllByRole("listitem");

  await user.type(screen.getByLabelText("Title"), "Piranesi");
  await user.type(screen.getByLabelText("Author"), "Susanna Clarke");
  await user.click(screen.getByRole("button", { name: "Add book" }));

  expect(mocked.createBook).toHaveBeenCalledWith({
    title: "Piranesi",
    author: "Susanna Clarke",
  });
  expect(screen.getByLabelText("Title")).toHaveValue("");
});

test("shows the error of the API when adding fails and keeps the input", async () => {
  const user = userEvent.setup();
  mocked.createBook.mockRejectedValue(
    new api.ApiError("author is required and must be a non-empty string", 400)
  );
  render(<App />);
  await screen.findAllByRole("listitem");

  await user.type(screen.getByLabelText("Title"), "Piranesi");
  await user.click(screen.getByRole("button", { name: "Add book" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("author is required");
  expect(screen.getByLabelText("Title")).toHaveValue("Piranesi");
});
