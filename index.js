const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { ListToolsRequestSchema, CallToolRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

const { TOOLS } = require("./lib/tools");
const { handlers } = require("./lib/handlers");
const { errorResult } = require("./lib/helpers");

// ── MCP Server ─────────────────────────────────────────
const server = new Server(
  { name: "httptoolkit-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = handlers[name];

  if (!handler) return errorResult(`Unknown tool: ${name}`);

  try {
    return await handler(args);
  } catch (error) {
    return errorResult(error.message);
  }
});

// ── Start ──────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("httptoolkit-mcp server running on stdio");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
