// ── Live traffic capture via UI bridge ─────────────────
// Reads exchanges from the UI's webpack dev server endpoint.
// The UI posts its EventsStore data to /api/exchanges every 2s.
// This means: same data you see in the UI = what the MCP reads.

const UI_URL = process.env.HTK_UI_URL || "http://localhost:8080";

const exchanges = new Map();
let connected = false;
let pollInterval = null;

async function connectToServer() {
  if (connected) return;

  // Test the endpoint
  const res = await fetch(`${UI_URL}/api/exchanges`);
  if (!res.ok) throw new Error(`UI bridge not available (${res.status})`);

  // Poll every 2 seconds
  pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`${UI_URL}/api/exchanges`);
      if (!res.ok) return;
      const data = await res.json();

      // Update our local map
      exchanges.clear();
      for (const ex of data) {
        exchanges.set(ex.id, ex);
      }
    } catch (e) {}
  }, 2000);

  // Do first poll immediately
  const data = await res.json();
  for (const ex of data) {
    exchanges.set(ex.id, ex);
  }

  connected = true;
}

function isConnected() {
  return connected;
}

function getProxyPort() {
  return null; // No own proxy — reads from UI
}

async function ensureConnected() {
  if (process.env.NODE_TEST === "1") return;
  if (!connected) await connectToServer();
}

function getExchanges() {
  return exchanges;
}

function clearExchanges() {
  const count = exchanges.size;
  exchanges.clear();
  return count;
}

module.exports = { connectToServer, ensureConnected, isConnected, getProxyPort, getExchanges, clearExchanges };
