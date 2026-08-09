# Kairos AI Assistant — 15-minute setup

The AI assistant lets you type things like *"add a task to meditate every
morning at 7am"* and it fills in the form and saves it for you. It runs on
**Claude** (Anthropic). To keep your API key safe, the key lives on a tiny
**Cloudflare Worker** (free tier) — not in the public web page.

You'll do this once:

```
[ Kairos web page ]  ──►  [ Cloudflare Worker ]  ──►  [ Anthropic API ]
   (public, no key)         (holds the secret key)       (Claude)
```

---

## 1. Get an Anthropic API key (~3 min)

1. Go to <https://console.anthropic.com> and sign in / sign up.
2. **Settings → API Keys → Create Key**. Copy it (starts with `sk-ant-...`).
3. **Set a spending limit** (**Settings → Limits**) — e.g. $5/month. This is
   your safety net; the assistant is cheap (it defaults to the low-cost
   *Haiku* model) but a limit means you can never be surprised.

## 2. Create the Cloudflare Worker (~7 min)

1. Go to <https://dash.cloudflare.com> and sign in / sign up (free).
2. **Compute (Workers) → Create → Create Worker**.
3. Give it a name, e.g. `kairos-ai`, click **Deploy** (it deploys a hello-world).
4. Click **Edit code**. Delete everything in the editor and paste the entire
   contents of [`worker.js`](./worker.js) from this repo. Click **Deploy**.

## 3. Add your key + origin as variables (~3 min)

In the Worker's page → **Settings → Variables and Secrets**:

| Type       | Name                | Value                                   |
|------------|---------------------|-----------------------------------------|
| **Secret** | `ANTHROPIC_API_KEY` | your `sk-ant-...` key                    |
| Text       | `ALLOWED_ORIGIN`    | `https://YOURNAME.github.io`            |
| Text       | `MODEL` *(optional)*| `claude-haiku-4-5` (or `claude-opus-5`) |

- `ALLOWED_ORIGIN` is the **origin** of your live site — just the scheme +
  host, **no path**. For a GitHub Pages project site it is
  `https://YOURNAME.github.io` (not `.../daily-tracker-`).
- Leave `MODEL` unset to use the cheap default (`claude-haiku-4-5`). Set it to
  `claude-opus-5` for the smartest (and pricier) answers.

Click **Deploy** again after saving the variables.

## 4. Point Kairos at your Worker (~1 min)

1. Copy your Worker URL from the Cloudflare page — it looks like
   `https://kairos-ai.YOURNAME.workers.dev`.
2. In `index.html`, find this line near the top of the script:

   ```js
   var AI_PROXY_URL = ""; // paste your Cloudflare Worker URL here
   ```

   Paste your URL between the quotes, commit, and push. GitHub Pages will
   update in a minute.

That's it. Open Kairos, tap the **✦ AI** button (bottom-right, or **AI
Assistant** in the ☰ menu) and start typing.

---

## What the assistant can do

- **Add tasks** — "add a workout task Mon/Wed/Fri at 6pm"
- **Complete today's tasks** — "mark meditation done for today"
- **List / delete tasks**
- **Start a goal / challenge** — "start a 30 day no-sugar goal"
- **Show Up** — "I showed up today"
- **Tell you your status** — streak, coins, today's tasks
- **Answer questions** and ask you for anything it needs before acting.

Everything it does is on **your own** account data (the same Firestore rules
apply). It cannot see or touch anyone else's data.

## Costs & safety

- The default **Haiku** model costs roughly $1 per *million* input tokens — a
  typical chat turn is a few thousand tokens, so real-world use is fractions
  of a cent. Your Anthropic spend limit is the hard cap.
- The Worker only answers requests from your `ALLOWED_ORIGIN` and clamps the
  response size, so it can't be trivially abused as a free Claude endpoint.
  The `Origin` check is not bulletproof against non-browser clients — the
  Anthropic spend limit is your real protection, so keep it set.
- If you ever want to rotate the key: create a new key in the Anthropic
  console, update the `ANTHROPIC_API_KEY` secret in Cloudflare, delete the
  old key. No web-app change needed.

## If it doesn't work

- **"AI assistant isn't set up yet"** in the app → `AI_PROXY_URL` is still
  empty in `index.html`.
- **Forbidden origin / CORS error** → `ALLOWED_ORIGIN` doesn't exactly match
  your site's origin (check for a trailing slash or a wrong subdomain).
- **500 missing ANTHROPIC_API_KEY** → the secret wasn't saved; re-add it and
  redeploy.
- **401 from Anthropic** → the API key is wrong or was revoked.
