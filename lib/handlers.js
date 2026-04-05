// ── Tool handlers (read-only) ─────────────────────────
const { truncateBody, jsonResult, textResult } = require("./helpers");
const { ensureConnected, getExchanges, clearExchanges } = require("./capture");

const handlers = {
  async list_exchanges(args) {
    await ensureConnected();
    let results = Array.from(getExchanges().values())
      .sort((a, b) => (a.startTime || 0) - (b.startTime || 0));

    if (args?.method)
      results = results.filter((e) => e.request.method.toUpperCase() === args.method.toUpperCase());
    if (args?.url)
      results = results.filter((e) => e.request.url.toLowerCase().includes(args.url.toLowerCase()));
    if (args?.status)
      results = results.filter((e) => e.response && e.response.statusCode === Number(args.status));

    const list = results.slice(0, args?.limit || 50).map((e, i) => ({
      index: i + 1,
      id: e.id,
      method: e.request.method,
      url: e.request.url,
      status: e.response?.statusCode || (e.aborted ? "ABORTED" : "PENDING"),
      time: e.startTime ? new Date(e.startTime).toISOString() : null,
    }));

    return list.length === 0 ? textResult("No exchanges captured yet.") : jsonResult(list);
  },

  async get_exchange(args) {
    await ensureConnected();
    const ex = getExchanges().get(args.id);
    if (!ex) return textResult(`Exchange ${args.id} not found.`);

    const withBody = args.includeBody !== false;
    return jsonResult({
      id: ex.id,
      time: ex.startTime ? new Date(ex.startTime).toISOString() : null,
      aborted: ex.aborted,
      request: {
        ...ex.request,
        body: withBody ? truncateBody(ex.request.body) : "[omitted]",
      },
      response: ex.response
        ? { ...ex.response, body: withBody ? truncateBody(ex.response.body) : "[omitted]" }
        : null,
    });
  },

  async get_request_body(args) {
    await ensureConnected();
    const ex = getExchanges().get(args.id);
    if (!ex) return textResult(`Exchange ${args.id} not found.`);
    return textResult(ex.request.body || "[empty body]");
  },

  async get_response_body(args) {
    await ensureConnected();
    const ex = getExchanges().get(args.id);
    if (!ex) return textResult(`Exchange ${args.id} not found.`);
    if (!ex.response) return textResult("No response yet (pending).");
    return textResult(ex.response.body || "[empty body]");
  },

  async search_bodies(args) {
    await ensureConnected();
    const pattern = args.pattern.toLowerCase();
    const limit = args.limit || 20;
    const matches = [];

    for (const ex of getExchanges().values()) {
      if (matches.length >= limit) break;
      const reqBody = ex.request?.body || "";
      const resBody = (ex.response && ex.response !== "aborted") ? (ex.response.body || "") : "";
      const reqMatch = reqBody.toLowerCase().includes(pattern);
      const resMatch = resBody.toLowerCase().includes(pattern);
      if (reqMatch || resMatch) {
        matches.push({
          id: ex.id,
          method: ex.request.method,
          url: ex.request.url,
          status: ex.response?.statusCode || "PENDING",
          matchIn: [...(reqMatch ? ["request_body"] : []), ...(resMatch ? ["response_body"] : [])],
        });
      }
    }

    return matches.length === 0 ? textResult(`No matches for "${args.pattern}".`) : jsonResult(matches);
  },

  async get_stats() {
    await ensureConnected();
    const all = Array.from(getExchanges().values());
    const methods = {};
    const statuses = {};
    all.forEach((e) => {
      methods[e.request.method] = (methods[e.request.method] || 0) + 1;
      if (e.response) statuses[e.response.statusCode] = (statuses[e.response.statusCode] || 0) + 1;
    });
    return jsonResult({
      total: all.length,
      pending: all.filter((e) => !e.response && !e.aborted).length,
      aborted: all.filter((e) => e.aborted).length,
      methods,
      statusCodes: statuses,
    });
  },

  async clear_exchanges() {
    const count = clearExchanges();
    return textResult(`Cleared ${count} exchanges.`);
  },
};

module.exports = { handlers };
