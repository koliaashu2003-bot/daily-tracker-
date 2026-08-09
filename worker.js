/**
 * Kairos AI proxy — Cloudflare Worker
 * ------------------------------------
 * This tiny Worker sits between the Kairos web app and the Anthropic API.
 * It holds your ANTHROPIC_API_KEY as a server-side secret so the key is
 * NEVER shipped in the public web page. The browser talks to this Worker;
 * the Worker talks to Anthropic.
 *
 * Set these in the Cloudflare dashboard (see DEPLOY-worker.md):
 *   Secret   ANTHROPIC_API_KEY  = sk-ant-...           (Settings > Variables > Secrets)
 *   Variable ALLOWED_ORIGIN     = https://<you>.github.io   (your Kairos origin)
 *   Variable MODEL   (optional) = claude-haiku-4-5     (defaults to Haiku — cheap & fast)
 *
 * Security notes:
 *  - Only requests from ALLOWED_ORIGIN are answered (CORS + a server-side
 *    Origin check). The browser cannot forge its Origin header, so this
 *    stops casual abuse from other sites.
 *  - The Origin header can be spoofed by non-browser clients, so this is
 *    NOT bulletproof. Also set a low monthly spend limit in the Anthropic
 *    console and (optionally) a Cloudflare rate-limiting rule.
 *  - max_tokens is clamped server-side so a caller cannot request a huge,
 *    expensive completion.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MAX_TOKENS_CAP = 1536;   // hard ceiling on output tokens per call
const MAX_MESSAGES   = 40;     // reject absurdly long histories

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN || "";
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, allowed);

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, cors);
    }
    // Origin gate — only our app may call this Worker.
    if (allowed && origin && origin !== allowed) {
      return json({ error: "Forbidden origin" }, 403, cors);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: "Server not configured: missing ANTHROPIC_API_KEY" }, 500, cors);
    }

    let body;
    try { body = await request.json(); }
    catch (e) { return json({ error: "Invalid JSON body" }, 400, cors); }

    const messages = Array.isArray(body.messages) ? body.messages : null;
    if (!messages || !messages.length) {
      return json({ error: "messages[] required" }, 400, cors);
    }
    if (messages.length > MAX_MESSAGES) {
      return json({ error: "Too many messages" }, 400, cors);
    }

    const payload = {
      model: env.MODEL || "claude-haiku-4-5",
      max_tokens: Math.min(Number(body.max_tokens) || 1024, MAX_TOKENS_CAP),
      messages: messages,
    };
    if (typeof body.system === "string" && body.system) payload.system = body.system;
    if (Array.isArray(body.tools) && body.tools.length) payload.tools = body.tools;

    let apiResp;
    try {
      apiResp = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return json({ error: "Upstream fetch failed: " + (e && e.message) }, 502, cors);
    }

    // Pass the Anthropic response body straight through, keeping its status.
    const text = await apiResp.text();
    return new Response(text, {
      status: apiResp.status,
      headers: Object.assign({ "content-type": "application/json" }, cors),
    });
  },
};

function corsHeaders(origin, allowed) {
  // Echo the caller's origin only when it matches; otherwise fall back to the
  // configured origin so browsers get a clear CORS rejection.
  const o = allowed && origin === allowed ? origin : (allowed || "*");
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: Object.assign({ "content-type": "application/json" }, cors || {}),
  });
}
