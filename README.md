# httptoolkit-mcp

MCP server that reads HTTP exchanges captured by HTTP Toolkit UI in real time.

## How it works

```
Intercepted browser
    |
    v
httptoolkit-server (proxy on port 8000)
    |
    v
HTTP Toolkit UI (localhost:8080) -- displays requests
    |
    v  POST /api/exchanges every 2s (dev only)
Webpack dev server middleware
    |
    v  GET /api/exchanges
httptoolkit-mcp -- Claude reads the requests
```

The UI serializes exchanges from `EventsStore` and posts them to the webpack dev server middleware every 2 seconds. The MCP reads them via HTTP polling. What you see in the UI is what the MCP reads.

## Requirements

- Node.js >= 18
- HTTP Toolkit UI running at `http://localhost:8080`
- **UI must be patched** with the exchange bridge (see below)

## UI modifications required

This MCP does **not** work with a stock HTTP Toolkit UI. Two files must be modified:

### 1. `automation/webpack.dev.ts` — Add the exchange bridge middleware

Add `setupMiddlewares` to the `devServer` config and a cache variable:

```typescript
let exchangeCache: any[] = [];

// Inside devServer config:
setupMiddlewares: (middlewares: any[], devServer: any) => {
    const express = require('express');
    const jsonParser = express.json({ limit: '50mb' });

    devServer.app!.post('/api/exchanges', jsonParser, (req: any, res: any) => {
        exchangeCache = req.body || [];
        res.json({ ok: true, count: exchangeCache.length });
    });

    devServer.app!.get('/api/exchanges', (_req: any, res: any) => {
        res.json(exchangeCache);
    });

    return middlewares;
},
```

### 2. `src/index.tsx` — Post exchanges to the bridge (dev only)

Add at the end of the file, after `module.hot`:

```typescript
if (process.env.NODE_ENV === 'development') {
    appStartupPromise.then(() => {
        setInterval(() => {
            try {
                const exs = (eventsStore.exchanges || []).map((ex: any) => ({
                    id: ex.id,
                    startTime: ex.timingEvents?.startTime || 0,
                    request: {
                        method: ex.request?.method,
                        url: ex.request?.url,
                        headers: ex.request?.headers,
                        body: null,
                    },
                    response: ex.response && ex.response !== 'aborted' ? {
                        statusCode: ex.response.statusCode,
                        statusMessage: ex.response.statusMessage,
                        headers: ex.response.headers,
                        body: null,
                    } : ex.response === 'aborted' ? 'aborted' : null,
                }));
                fetch('/api/exchanges', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(exs),
                }).catch(() => {});
            } catch (e) {}
        }, 2000);
    });
}
```

These changes only run in development mode. Production builds are not affected.

## Setup

```bash
cd httptoolkit-mcp
npm install
```

Add to `.mcp.json` or Claude Code settings:

```json
{
  "mcpServers": {
    "httptoolkit": {
      "command": "node",
      "args": ["path/to/httptoolkit-mcp/index.js"]
    }
  }
}
```

## Tools

| Tool | Description |
|---|---|
| `list_exchanges` | List requests sorted chronologically. Filters: `method`, `url`, `status`, `limit` |
| `get_exchange` | Full details of a request: request/response headers |
| `get_request_body` | Request body |
| `get_response_body` | Response body |
| `search_bodies` | Search text in request/response bodies |
| `get_stats` | Summary: total, methods breakdown, status codes |
| `clear_exchanges` | Clear exchanges from memory |

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `HTK_UI_URL` | `http://localhost:8080` | HTTP Toolkit UI URL |

## Tests

```bash
npm test
```
