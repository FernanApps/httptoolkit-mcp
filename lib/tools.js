// ── Tool definitions (read-only) ──────────────────────

const TOOLS = [
  {
    name: "list_exchanges",
    description: "List captured HTTP exchanges sorted chronologically. Filters: method, url, status, limit.",
    inputSchema: {
      type: "object",
      properties: {
        method: { type: "string", description: "Filter by HTTP method" },
        url: { type: "string", description: "Filter by URL substring" },
        status: { type: "number", description: "Filter by status code" },
        limit: { type: "number", description: "Max results (default: 50)" },
      },
    },
  },
  {
    name: "get_exchange",
    description: "Get full details of an exchange: request/response headers, body, timing.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Exchange ID" },
        includeBody: { type: "boolean", description: "Include bodies (default: true)" },
      },
      required: ["id"],
    },
  },
  {
    name: "get_request_body",
    description: "Get the full request body of an exchange.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "get_response_body",
    description: "Get the full response body of an exchange.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "search_bodies",
    description: "Search through request/response bodies for a text pattern.",
    inputSchema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Text to search" },
        limit: { type: "number", description: "Max results (default: 20)" },
      },
      required: ["pattern"],
    },
  },
  {
    name: "get_stats",
    description: "Get summary: total exchanges, methods breakdown, status codes.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "clear_exchanges",
    description: "Clear all captured exchanges from memory.",
    inputSchema: { type: "object", properties: {} },
  },
];

module.exports = { TOOLS };
