import { describe, expect, it } from "vitest";

import { parseBookInput, parseListQuery } from "./validation";

describe("parseBookInput", () => {
  it("accepts title and author and sets the defaults", () => {
    expect(parseBookInput({ title: "T", author: "A" })).toEqual({
      ok: true,
      value: { title: "T", author: "A", status: "want-to-read", rating: null, notes: "" },
    });
  });

  it("accepts all fields", () => {
    const body = { title: "T", author: "A", status: "done", rating: 4, notes: "n" };
    expect(parseBookInput(body)).toEqual({ ok: true, value: body });
  });

  it("trims title and author", () => {
    const result = parseBookInput({ title: "  T  ", author: " A " });
    expect(result.ok && result.value).toMatchObject({ title: "T", author: "A" });
  });

  it("accepts rating null", () => {
    const result = parseBookInput({ title: "T", author: "A", rating: null });
    expect(result.ok && result.value.rating).toBeNull();
  });

  it("ignores an id and unknown fields", () => {
    const result = parseBookInput({ title: "T", author: "A", id: "x", admin: true });
    expect(result.ok && result.value).not.toHaveProperty("id");
    expect(result.ok && result.value).not.toHaveProperty("admin");
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["an array", [{ title: "T", author: "A" }]],
    ["a string", "title"],
    ["a number", 5],
  ])("rejects a body that is %s", (_name, body) => {
    expect(parseBookInput(body).ok).toBe(false);
  });

  it.each([
    ["missing title", { author: "A" }],
    ["empty title", { title: "", author: "A" }],
    ["spaces-only title", { title: "   ", author: "A" }],
    ["title as number", { title: 5, author: "A" }],
    ["missing author", { title: "T" }],
    ["empty author", { title: "T", author: "" }],
    ["author as array", { title: "T", author: ["A"] }],
    ["unknown status", { title: "T", author: "A", status: "finished" }],
    ["status as number", { title: "T", author: "A", status: 1 }],
    ["rating 0", { title: "T", author: "A", rating: 0 }],
    ["rating 6", { title: "T", author: "A", rating: 6 }],
    ["rating 3.5", { title: "T", author: "A", rating: 3.5 }],
    ["rating as text", { title: "T", author: "A", rating: "4" }],
    ["rating NaN", { title: "T", author: "A", rating: Number.NaN }],
    ["notes as number", { title: "T", author: "A", notes: 1 }],
    ["notes null", { title: "T", author: "A", notes: null }],
  ])("rejects %s", (_name, body) => {
    const result = parseBookInput(body);
    expect(result.ok).toBe(false);
    expect(!result.ok && typeof result.error).toBe("string");
  });
});

describe("parseListQuery", () => {
  it("accepts an empty query", () => {
    expect(parseListQuery({})).toEqual({ ok: true, value: { filter: {}, offset: 0 } });
  });

  it("accepts a valid status and q", () => {
    expect(parseListQuery({ status: "reading", q: "dune" })).toEqual({
      ok: true,
      value: { filter: { status: "reading", q: "dune" }, offset: 0 },
    });
  });

  it("accepts sort, limit and offset", () => {
    expect(parseListQuery({ sort: "title", limit: "5", offset: "10" })).toEqual({
      ok: true,
      value: { filter: {}, sort: "title", limit: 5, offset: 10 },
    });
  });

  it.each(["1", "100"])("accepts limit %s", (limit) => {
    expect(parseListQuery({ limit }).ok).toBe(true);
  });

  it("accepts offset 0", () => {
    expect(parseListQuery({ offset: "0" })).toMatchObject({ ok: true, value: { offset: 0 } });
  });

  it.each([
    ["unknown sort", { sort: "author" }],
    ["sort with other case", { sort: "Title" }],
    ["repeated sort", { sort: ["title", "title"] }],
    ["limit abc", { limit: "abc" }],
    ["empty limit", { limit: "" }],
    ["limit 0", { limit: "0" }],
    ["limit 101", { limit: "101" }],
    ["negative limit", { limit: "-1" }],
    ["limit 1.5", { limit: "1.5" }],
    ["limit 1e2", { limit: "1e2" }],
    ["limit with spaces", { limit: " 5" }],
    ["repeated limit", { limit: ["5", "6"] }],
    ["offset abc", { offset: "abc" }],
    ["negative offset", { offset: "-1" }],
    ["offset 2.5", { offset: "2.5" }],
    ["huge offset", { offset: "99999999999999999999" }],
  ])("rejects %s", (_name, query) => {
    const result = parseListQuery(query);
    expect(result.ok).toBe(false);
    expect(!result.ok && typeof result.error).toBe("string");
  });

  it("rejects an unknown status", () => {
    expect(parseListQuery({ status: "finished" }).ok).toBe(false);
  });

  it("rejects a repeated q (array)", () => {
    expect(parseListQuery({ q: ["a", "b"] }).ok).toBe(false);
  });
});
