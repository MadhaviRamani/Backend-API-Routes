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
    expect(parseListQuery({})).toEqual({ ok: true, value: {} });
  });

  it("accepts a valid status and q", () => {
    expect(parseListQuery({ status: "reading", q: "dune" })).toEqual({
      ok: true,
      value: { status: "reading", q: "dune" },
    });
  });

  it("rejects an unknown status", () => {
    expect(parseListQuery({ status: "finished" }).ok).toBe(false);
  });

  it("rejects a repeated q (array)", () => {
    expect(parseListQuery({ q: ["a", "b"] }).ok).toBe(false);
  });
});
