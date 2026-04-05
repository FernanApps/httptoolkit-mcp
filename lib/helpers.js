// ── Response helpers ───────────────────────────────────

function truncateBody(body, maxLen = 5000) {
  if (!body) return null;
  if (body.length <= maxLen) return body;
  return body.substring(0, maxLen) + `\n... [truncated, ${body.length} total bytes]`;
}

function jsonResult(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function textResult(text) {
  return { content: [{ type: "text", text }] };
}

function errorResult(message) {
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

module.exports = { truncateBody, jsonResult, textResult, errorResult };
