// ── Configuration ──────────────────────────────────────
module.exports = {
  SERVER_API_URL: process.env.HTK_SERVER_URL || "http://127.0.0.1:45457",
  ADMIN_URL: process.env.HTK_ADMIN_URL || "http://127.0.0.1:45456",
  ORIGIN: "https://app.httptoolkit.tech",
};
