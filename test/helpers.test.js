const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { truncateBody, jsonResult, textResult, errorResult } = require("../lib/helpers");

describe("helpers", () => {
  describe("truncateBody", () => {
    it("returns null for null input", () => {
      assert.equal(truncateBody(null), null);
    });

    it("returns null for undefined input", () => {
      assert.equal(truncateBody(undefined), null);
    });

    it("returns body as-is if under max length", () => {
      assert.equal(truncateBody("hello", 10), "hello");
    });

    it("truncates body over max length", () => {
      const body = "a".repeat(100);
      const result = truncateBody(body, 50);
      assert.ok(result.startsWith("a".repeat(50)));
      assert.ok(result.includes("[truncated, 100 total bytes]"));
    });

    it("uses default maxLen of 5000", () => {
      const short = "x".repeat(5000);
      assert.equal(truncateBody(short), short);

      const long = "x".repeat(5001);
      assert.ok(truncateBody(long).includes("[truncated"));
    });
  });

  describe("jsonResult", () => {
    it("wraps data as JSON text content", () => {
      const result = jsonResult({ foo: "bar" });
      assert.equal(result.content.length, 1);
      assert.equal(result.content[0].type, "text");
      assert.deepEqual(JSON.parse(result.content[0].text), { foo: "bar" });
    });

    it("handles arrays", () => {
      const result = jsonResult([1, 2, 3]);
      assert.deepEqual(JSON.parse(result.content[0].text), [1, 2, 3]);
    });
  });

  describe("textResult", () => {
    it("wraps text as content", () => {
      const result = textResult("hello");
      assert.equal(result.content[0].text, "hello");
      assert.equal(result.content[0].type, "text");
    });
  });

  describe("errorResult", () => {
    it("wraps error message with isError flag", () => {
      const result = errorResult("something broke");
      assert.equal(result.content[0].text, "Error: something broke");
      assert.equal(result.isError, true);
    });
  });
});
