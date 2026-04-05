const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { TOOLS } = require("../lib/tools");

describe("tools definitions", () => {
  const EXPECTED_TOOLS = [
    "list_exchanges", "get_exchange", "get_request_body",
    "get_response_body", "search_bodies", "get_stats", "clear_exchanges",
  ];

  it("exports all 7 tools", () => {
    assert.equal(TOOLS.length, 7);
  });

  for (const name of EXPECTED_TOOLS) {
    it(`has tool "${name}"`, () => {
      const tool = TOOLS.find((t) => t.name === name);
      assert.ok(tool, `Tool "${name}" not found`);
    });
  }

  it("every tool has name, description, and inputSchema", () => {
    for (const tool of TOOLS) {
      assert.ok(tool.name, `Tool missing name`);
      assert.ok(tool.description, `${tool.name} missing description`);
      assert.ok(tool.inputSchema, `${tool.name} missing inputSchema`);
      assert.equal(tool.inputSchema.type, "object", `${tool.name} schema type must be object`);
    }
  });

  it("search_bodies requires pattern", () => {
    const tool = TOOLS.find((t) => t.name === "search_bodies");
    assert.deepEqual(tool.inputSchema.required, ["pattern"]);
  });

  it("get_exchange requires id", () => {
    const tool = TOOLS.find((t) => t.name === "get_exchange");
    assert.deepEqual(tool.inputSchema.required, ["id"]);
  });
});
