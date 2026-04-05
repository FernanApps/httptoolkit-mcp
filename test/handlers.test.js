process.env.NODE_TEST = "1"; // Skip real server connection

const assert = require("node:assert/strict");
const { describe, it, beforeEach } = require("node:test");
const { handlers } = require("../lib/handlers");
const capture = require("../lib/capture");

function injectExchanges(list) {
  const map = capture.getExchanges();
  map.clear();
  for (const ex of list) map.set(ex.id, ex);
}

function makeExchange(id, method, url, statusCode, reqBody, resBody) {
  return {
    id,
    request: {
      method,
      url,
      path: new URL(url).pathname,
      protocol: "https",
      httpVersion: "1.1",
      headers: { host: new URL(url).host },
      body: reqBody || null,
      timingEvents: {},
      remoteIpAddress: "127.0.0.1",
      remotePort: 12345,
      tags: [],
      matchedRuleId: null,
    },
    response: statusCode
      ? {
          statusCode,
          statusMessage: statusCode === 200 ? "OK" : "Error",
          headers: { "content-type": "application/json" },
          body: resBody || null,
          timingEvents: {},
          tags: [],
        }
      : null,
    aborted: false,
  };
}

// ── Tests ─────────────────────────────────────────────
// Note: these tests only cover handlers that don't need a live server connection.
// We mock the capture module's connected state by pre-populating exchanges.

describe("handlers - capture tools (offline)", () => {
  beforeEach(() => {
    capture.getExchanges().clear();
  });

  describe("list_exchanges", () => {
    it("returns empty when no exchanges", async () => {
      const result = await handlers.list_exchanges({});
      assert.equal(result.content[0].text, "No exchanges captured yet.");
    });

    it("lists exchanges sorted chronologically", async () => {
      injectExchanges([
        makeExchange("1", "GET", "https://api.example.com/users", 200),
        makeExchange("2", "POST", "https://api.example.com/login", 401),
      ]);

      const result = await handlers.list_exchanges({});
      const data = JSON.parse(result.content[0].text);
      assert.equal(data.length, 2);
      assert.equal(data[0].id, "1"); // oldest first (chronological)
      assert.equal(data[1].id, "2");
      assert.equal(data[0].index, 1);
      assert.equal(data[1].index, 2);
    });

    it("filters by method", async () => {
      injectExchanges([
        makeExchange("1", "GET", "https://example.com/a", 200),
        makeExchange("2", "POST", "https://example.com/b", 200),
      ]);

      const result = await handlers.list_exchanges({ method: "POST" });
      const data = JSON.parse(result.content[0].text);
      assert.equal(data.length, 1);
      assert.equal(data[0].method, "POST");
    });

    it("filters by url", async () => {
      injectExchanges([
        makeExchange("1", "GET", "https://example.com/users", 200),
        makeExchange("2", "GET", "https://example.com/posts", 200),
      ]);

      const result = await handlers.list_exchanges({ url: "users" });
      const data = JSON.parse(result.content[0].text);
      assert.equal(data.length, 1);
      assert.ok(data[0].url.includes("users"));
    });

    it("filters by status", async () => {
      injectExchanges([
        makeExchange("1", "GET", "https://example.com/ok", 200),
        makeExchange("2", "GET", "https://example.com/fail", 500),
      ]);

      const result = await handlers.list_exchanges({ status: 500 });
      const data = JSON.parse(result.content[0].text);
      assert.equal(data.length, 1);
      assert.equal(data[0].status, 500);
    });

    it("respects limit", async () => {
      injectExchanges([
        makeExchange("1", "GET", "https://example.com/a", 200),
        makeExchange("2", "GET", "https://example.com/b", 200),
        makeExchange("3", "GET", "https://example.com/c", 200),
      ]);

      const result = await handlers.list_exchanges({ limit: 2 });
      const data = JSON.parse(result.content[0].text);
      assert.equal(data.length, 2);
    });
  });

  describe("get_exchange", () => {
    it("returns not found for missing id", async () => {
      const result = await handlers.get_exchange({ id: "missing" });
      assert.ok(result.content[0].text.includes("not found"));
    });

    it("returns full exchange details", async () => {
      injectExchanges([
        makeExchange("1", "GET", "https://example.com/test", 200, '{"q":"hello"}', '{"result":"ok"}'),
      ]);

      const result = await handlers.get_exchange({ id: "1" });
      const data = JSON.parse(result.content[0].text);
      assert.equal(data.id, "1");
      assert.equal(data.request.method, "GET");
      assert.equal(data.response.statusCode, 200);
      assert.equal(data.request.body, '{"q":"hello"}');
      assert.equal(data.response.body, '{"result":"ok"}');
    });

    it("omits body when includeBody=false", async () => {
      injectExchanges([
        makeExchange("1", "GET", "https://example.com/test", 200, "body", "resp"),
      ]);

      const result = await handlers.get_exchange({ id: "1", includeBody: false });
      const data = JSON.parse(result.content[0].text);
      assert.equal(data.request.body, "[omitted]");
      assert.equal(data.response.body, "[omitted]");
    });
  });

  describe("get_request_body", () => {
    it("returns empty body message", async () => {
      injectExchanges([makeExchange("1", "GET", "https://example.com/", 200)]);
      const result = await handlers.get_request_body({ id: "1" });
      assert.equal(result.content[0].text, "[empty body]");
    });

    it("returns request body", async () => {
      injectExchanges([
        makeExchange("1", "POST", "https://example.com/", 200, "request data", null),
      ]);
      const result = await handlers.get_request_body({ id: "1" });
      assert.equal(result.content[0].text, "request data");
    });
  });

  describe("get_response_body", () => {
    it("returns pending for no response", async () => {
      injectExchanges([makeExchange("1", "GET", "https://example.com/", null)]);
      const result = await handlers.get_response_body({ id: "1" });
      assert.ok(result.content[0].text.includes("pending"));
    });

    it("returns response body", async () => {
      injectExchanges([
        makeExchange("1", "GET", "https://example.com/", 200, null, "response data"),
      ]);
      const result = await handlers.get_response_body({ id: "1" });
      assert.equal(result.content[0].text, "response data");
    });
  });

  describe("search_bodies", () => {
    it("finds matches in request body", async () => {
      injectExchanges([
        makeExchange("1", "POST", "https://example.com/", 200, "secret token here", null),
      ]);

      const result = await handlers.search_bodies({ pattern: "secret" });
      const data = JSON.parse(result.content[0].text);
      assert.equal(data.length, 1);
      assert.deepEqual(data[0].matchIn, ["request_body"]);
    });

    it("finds matches in response body", async () => {
      injectExchanges([
        makeExchange("1", "GET", "https://example.com/", 200, null, "error: unauthorized"),
      ]);

      const result = await handlers.search_bodies({ pattern: "unauthorized" });
      const data = JSON.parse(result.content[0].text);
      assert.equal(data.length, 1);
      assert.deepEqual(data[0].matchIn, ["response_body"]);
    });

    it("finds matches in both", async () => {
      injectExchanges([
        makeExchange("1", "POST", "https://example.com/", 200, "token=abc", "token accepted"),
      ]);

      const result = await handlers.search_bodies({ pattern: "token" });
      const data = JSON.parse(result.content[0].text);
      assert.deepEqual(data[0].matchIn, ["request_body", "response_body"]);
    });

    it("returns no matches message", async () => {
      injectExchanges([makeExchange("1", "GET", "https://example.com/", 200)]);
      const result = await handlers.search_bodies({ pattern: "xyz" });
      assert.ok(result.content[0].text.includes("No matches"));
    });

    it("respects limit", async () => {
      injectExchanges([
        makeExchange("1", "GET", "https://a.com/", 200, "match", null),
        makeExchange("2", "GET", "https://b.com/", 200, "match", null),
        makeExchange("3", "GET", "https://c.com/", 200, "match", null),
      ]);

      const result = await handlers.search_bodies({ pattern: "match", limit: 2 });
      const data = JSON.parse(result.content[0].text);
      assert.equal(data.length, 2);
    });
  });

  describe("get_stats", () => {
    it("returns zero stats when empty", async () => {
      const result = await handlers.get_stats();
      const data = JSON.parse(result.content[0].text);
      assert.equal(data.total, 0);
      assert.equal(data.pending, 0);
      assert.equal(data.aborted, 0);
    });

    it("returns correct breakdown", async () => {
      injectExchanges([
        makeExchange("1", "GET", "https://example.com/a", 200),
        makeExchange("2", "GET", "https://example.com/b", 404),
        makeExchange("3", "POST", "https://example.com/c", 200),
        makeExchange("4", "GET", "https://example.com/d", null), // pending
      ]);

      const result = await handlers.get_stats();
      const data = JSON.parse(result.content[0].text);
      assert.equal(data.total, 4);
      assert.equal(data.pending, 1);
      assert.equal(data.methods["GET"], 3);
      assert.equal(data.methods["POST"], 1);
      assert.equal(data.statusCodes["200"], 2);
      assert.equal(data.statusCodes["404"], 1);
    });
  });

  describe("clear_exchanges", () => {
    it("clears and reports count", async () => {
      injectExchanges([
        makeExchange("1", "GET", "https://example.com/", 200),
        makeExchange("2", "GET", "https://example.com/", 200),
      ]);

      const result = await handlers.clear_exchanges();
      assert.ok(result.content[0].text.includes("Cleared 2"));
      assert.equal(capture.getExchanges().size, 0);
    });
  });
});
