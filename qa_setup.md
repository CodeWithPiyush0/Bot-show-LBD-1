# QA Comment Tool — Setup Guide (for a new game / new owner)

This guide sets up the in-game **QA commenting tool** from scratch on your own
backend. Follow it once and the tool works in your game: reviewers open the game
with `?qa=true`, click any element to leave a comment/bug, set QA & Dev statuses,
reply in threads, and export everything to CSV.

You should have received two folders:

- **`qa/`** — the tool itself (vanilla JS + CSS, no build step). Files:
  `qa-mode.js, qa-popup.js, qa-sidebar.js, qa-storage.js, qa-supabase.js,
  qa-export.js, qa-mode.css`
- **`supabase/functions/qa-action/index.ts`** — the backend "gatekeeper" function
  you'll deploy.

> **How it works in one line:** the `qa/` folder is a client that reads/creates
> comments directly in a Supabase table, and routes privileged actions
> (status changes, deletes, edits) through a small Supabase Edge Function that
> checks a password. You need your **own** Supabase project so your data and
> passwords are yours.

There are **two parts**: **A.** set up the Supabase backend (one-time, ~20 min),
**B.** wire the tool into your game (5 min). Part C is a ready-made prompt for
Claude to do Part B for you.

---

## Part A — Supabase backend (one-time)

### A1. Create a Supabase account + project
1. Go to **https://supabase.com** → sign up (free tier is plenty).
2. Click **New project**. Give it a name, set a **database password** (save it),
   pick a region near your testers. Wait ~2 min for it to provision.

### A2. Create the `qa_comments` table
Open your project → left sidebar **SQL Editor** → **New query** → paste this and
click **Run**:

```sql
-- needed for gen_random_uuid()
create extension if not exists pgcrypto;

create table public.qa_comments (
  id                 uuid primary key default gen_random_uuid(),
  app_name           text not null,           -- which game this comment belongs to
  page               text,                    -- location.pathname
  screen             text,                    -- human label of the screen
  selector           text,                    -- CSS selector of the clicked element
  x                  double precision,        -- pin position (px)
  y                  double precision,
  text               text,                    -- comment / bug description
  author             text,                    -- tester name
  parent_id          uuid references public.qa_comments(id) on delete cascade,
  status             text default 'open',     -- Dev status: open/in_progress/resolved/wontfix
  wontfix_reason     text,
  qa_status          text,                    -- QA status: 'pass' | 'fail' (bugs only)
  steps_to_reproduce text,
  expected_result    text,
  actual_result      text,
  created_at         timestamptz not null default now()
);

create index qa_comments_app_page_idx on public.qa_comments (app_name, page);
create index qa_comments_parent_idx   on public.qa_comments (parent_id);
```

### A3. Turn on Row Level Security + policies
In the same SQL Editor, run this:

```sql
alter table public.qa_comments enable row level security;

-- Anyone may READ and CREATE comments (the client uses the public key for these).
create policy "qa_read"   on public.qa_comments for select using (true);
create policy "qa_insert" on public.qa_comments for insert with check (true);

-- NOTE: there are intentionally NO update/delete policies. Editing, deleting,
-- and status changes are NOT allowed directly — they go through the edge
-- function (next step), which checks the Owner/QA password first.
```

### A4. Deploy the `qa-action` Edge Function
This function guards privileged actions with a password.

**Easiest — via the dashboard:**
1. Left sidebar → **Edge Functions** → **Create a new function** (or "Deploy via
   editor").
2. Name it **exactly** `qa-action`.
3. Delete the sample code and **paste the entire contents** of
   `supabase/functions/qa-action/index.ts` (the file you received).
4. ⚠️ **Turn OFF "Verify JWT"** for this function (there's a toggle in the deploy
   settings). The tool calls it without a login token — if JWT verification is
   ON, every call fails with 401. **This step is required.**
5. Click **Deploy**.

**Or via the Supabase CLI** (if you prefer the terminal):
```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>   # ref is in your project URL
supabase functions deploy qa-action --no-verify-jwt
```
(`--no-verify-jwt` is the CLI equivalent of turning the toggle off — required.)

### A5. Set the two passwords (function secrets)
The function reads `OWNER_PASSWORD` and `QA_PASSWORD` from secrets. These are the
login passwords your team will use (Owner = you/developer, QA = the tester).

**Dashboard:** Project **Settings** → **Edge Functions** → **Secrets** (or
"Manage secrets") → add two secrets:
- `OWNER_PASSWORD` = a password you choose (developer/owner)
- `QA_PASSWORD` = a password you choose (QA tester)

**Or CLI:**
```bash
supabase secrets set OWNER_PASSWORD="choose-a-strong-one" QA_PASSWORD="another-one"
```

> You do **not** need to set `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` —
> Supabase injects those into edge functions automatically.

### A6. Copy your Project URL + public key
Left sidebar → **Project Settings** → **API**. Copy two values:
1. **Project URL** — looks like `https://abcdefgh.supabase.co`
2. **Publishable / anon public key** — the **client-safe** key. Depending on your
   dashboard it's labelled either **"Publishable key"** (`sb_publishable_…`) or
   **"anon public"** (a long `eyJ…` token). Use that one. *(Never use the
   `service_role` / secret key in the game — that one stays server-side.)*

Keep these two handy for Part B.

✅ **Backend done.** You never touch Supabase again unless you change the tool.

---

## Part B — Wire the tool into your game

### B1. Place the folder
Put the **`qa/`** folder in your game next to its `index.html` (so the path
`qa/qa-mode.js` is correct). Keep the file names as-is.

### B2. Point the tool at YOUR backend — edit `qa/qa-supabase.js`
Near the top of `qa/qa-supabase.js`, change **three** values:

```js
const SUPABASE_URL  = 'https://YOUR-PROJECT.supabase.co';   // from A6
const SUPABASE_ANON = 'YOUR-PUBLISHABLE-OR-ANON-KEY';        // from A6

export const APP_NAME = 'your-game-slug';   // any unique name for THIS game
```

- `APP_NAME` just labels your comments; pick anything unique (e.g. `'my-game'`).
  (It matters only if several games share one Supabase project.)
- `EDGE_FUNCTION_URL` a couple lines below is built from `SUPABASE_URL`
  automatically — **don't change it**.
- Don't touch the `import … from 'https://esm.sh/@supabase/supabase-js@2'` line;
  it loads the Supabase library from a CDN (no install needed).

### B3. Add one script tag to `index.html`
Just before `</body>`:
```html
<script type="module" src="qa/qa-mode.js"></script>
```
That's all — it auto-loads `qa/qa-mode.css` itself.

### B4. Tell it about your screens — `detectScreen()` in `qa/qa-mode.js`
This maps the currently-visible screen to the label shown in the "Screen" column.
Find `function detectScreen()`. By default it reads
`document.querySelector('#stage .screen.is-active')` and maps element IDs to
labels in a `switch`.
- If your game uses a similar "one active screen at a time" structure, just
  replace the `switch` cases with **your** screen IDs → readable names.
- If your structure differs, change the selector to however your game marks the
  visible screen.
- If you skip this, the tool still works — comments are just tagged **"Other"**.

### B5. Serve over http(s) — not `file://`
The tool uses ES modules + network calls, so open the game from a **web server**,
not by double-clicking the HTML file. Any of these work:
- VS Code "Live Server" extension, or
- `npx serve` / `python -m http.server` in the game folder, or
- your normal deployed/hosting URL.

---

## Part C — Prompt for Claude (does Part B for you)

After you've done the backend (Part A) and dropped the `qa/` folder in, paste
this to Claude **inside your game's project** (fill in the two bracketed values
from A6, or leave them and edit `qa-supabase.js` yourself):

```
I've added a `qa/` folder — a reusable in-game QA comment tool (vanilla JS,
activated by ?qa=true). I've already set up its Supabase backend separately.
Please wire it into THIS game:

1. In `qa/qa-supabase.js`, set:
     SUPABASE_URL  = '[MY PROJECT URL]'
     SUPABASE_ANON = '[MY PUBLISHABLE/ANON KEY]'
     APP_NAME      = '[a unique slug for this game]'
   Leave the EDGE_FUNCTION_URL line and the esm.sh import unchanged.

2. Add this before </body> in index.html:
     <script type="module" src="qa/qa-mode.js"></script>

3. Adapt screen detection: open `qa/qa-mode.js`, find `function detectScreen()`.
   First INSPECT this game's index.html to see how screens are structured (the
   container selector and how the active/visible screen is marked). If it matches
   the existing `#stage .screen.is-active` pattern, just replace the `switch`
   cases with this game's screen IDs → readable labels; otherwise update the
   selector to match this game, then map the screens. (If unsure, leave it — the
   tool falls back to tagging comments "Other".)

4. Do NOT change anything else in the qa/ folder.

5. Verify: serve the game over http and open index.html?qa=true. Confirm there
   are no console errors, the QA sidebar appears, clicking "+ Comment" then an
   element opens the popup, and the screen name in the sidebar header matches the
   screen I'm on. Report the APP_NAME and the screen mapping you used.
```

---

## Part D — Using the tool

1. Open the game with `?qa=true` (e.g. `https://yoursite/index.html?qa=true`).
2. A welcome modal explains it; then pick a **role**:
   - **Owner** (developer) — password `OWNER_PASSWORD`. Reviews everything, sets
     **Dev status** (Open / In Progress / Resolved / Won't Fix), replies, deletes,
     and can export **all** comments to CSV.
   - **QA** (tester) — password `QA_PASSWORD`. Gets a **bug form** (Description,
     Steps to reproduce, Expected, Actual, **QA status** Pass/Fail), and can
     export **their own** comments to CSV.
   - **Other** — no password. Leaves simple comments; can reply.
3. Click **+ Comment**, then click any element to pin a comment there.
4. **⬇ Export CSV** (owner/qa only) is in the sidebar's filter row — downloads the
   bug sheet.
5. Toggle comment mode off (or remove `?qa=true`) to play normally.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Sidebar never appears | You didn't open with `?qa=true`, or you're on `file://` — serve over http(s) (B5). |
| Console error about modules / CORS | Same — must be served over http(s), not opened as a file. |
| Login says "Invalid password" | `OWNER_PASSWORD`/`QA_PASSWORD` secrets not set, or typo (A5). |
| Comments don't save (Save failed) | Table missing or RLS blocking inserts — re-run A2 + A3. Check the table is named exactly `qa_comments`. |
| Status change / delete fails with 401 or "rejected" | The edge function has **Verify JWT ON** — redeploy with it **OFF** / `--no-verify-jwt` (A4). |
| Status change fails with a permission message | Expected if you're the wrong role — Dev status is owner-only, QA status is owner/qa. |
| Comments from another game show up | `APP_NAME` isn't unique — set a distinct slug (B2). |
| "Screen" column says "Other" everywhere | `detectScreen()` not adapted to your screens (B4) — optional but nicer. |

---

### Security notes
- The key in `qa-supabase.js` is the **publishable/anon** key — it's designed to
  live in client code, so it's safe to ship. The **passwords** are the real gate.
- Reads & inserts are open (anyone with the page can read/leave comments); edits,
  deletes, and status changes require the Owner/QA password via the edge function.
- This is an internal review tool — host the `?qa=true` build where only your team
  can reach it (it's not meant to be public).
