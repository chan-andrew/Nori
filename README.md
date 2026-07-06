# Nori

Tell it your macro and price goals in plain language. It captures your location, searches nearby restaurant menus (real Pittsburgh dataset — 65 dishes across 15 restaurants in 5 neighborhoods), estimates nutrition per dish, and returns ranked matches with distance and delivery time. Tap one, read why it matched, then order through DoorDash.

## Stack

- **Frontend:** React + Tailwind CSS (Vite), in `client/`
- **Backend:** Node + Express, in `server/`
- **AI:** Claude Haiku 4.5 via the Anthropic API for query parsing and match explanations. The parsing prompt includes a fuzzy term table (`server/data/fuzzy_terms.json`) that maps vague phrases ("light", "comfort food", "post workout") to filter defaults — prompt-level, no fine tuning. Falls back to a built-in heuristic parser when no API key is set, so the app works offline too.
- **Data:** real menus with AI-estimated macros — 65 dishes across 15 restaurants in Oakland, Shadyside, Squirrel Hill, East Liberty, and Downtown (`server/data/`)
- **Auth:** Firebase Auth (Google + email/password) when a Firebase project is configured in `client/.env`; otherwise a local email/password fallback (scrypt-hashed, JSON store) so the app runs with zero setup.
- **Storage:** Firestore documents keyed by user id (profiles, order history, favorites, query logs) when Firebase is configured; local JSON files under `server/data/runtime/` otherwise. The restaurant/menu dataset stays a JSON file — 65 dishes doesn't need a database.

## Run it

Requires Node 18+ (repo was built against Node 24).

```sh
# Terminal 1 — backend on :4000
cd server
npm install
npm start

# Terminal 2 — frontend on :5173 (proxies /api to :4000)
cd client
npm install
npm run dev
```

Open http://localhost:5173.

### Enable real AI parsing (optional)

Without a key, the server uses a deterministic keyword parser (which also applies the fuzzy term table) and template explanations. To use Claude Haiku 4.5:

```sh
# server/.env
ANTHROPIC_API_KEY=sk-ant-...
```

then restart the server. Get a key at https://platform.claude.com.

### Enable Firebase Auth + Firestore (optional)

Create a Firebase project, enable the **Google** and **Email/Password** sign-in providers, create a **Firestore** database, then copy the web app config into `client/.env` (see `client/.env.example` for the `VITE_FIREBASE_*` variables) and restart the dev server. User profiles, onboarding answers, order history, favorites, and query logs move to Firestore collections (`users`, `order_history`, `favorites`, `query_logs`) keyed by user id.

## API

| Endpoint | Purpose |
|---|---|
| `POST /api/parse-query` | free text → structured filter object (fuzzy term table + fallback rule); logs the query, returns `query_log_id` |
| `POST /api/search` | filters + optional location → ranked dish list with match scores, distance, delivery estimate; widens the tolerance band automatically when nothing fits |
| `POST /api/refine` | adjusted filters → updated ranked list |
| `POST /api/explain` | dish id + original query → 2–3 sentence explanation |
| `POST /api/auth/signup`, `/api/auth/login` | local fallback auth (Firebase Auth replaces these when configured) |
| `GET/PUT /api/profile/:userId` | fetch / update profile & preferences (incl. saved address) |
| `POST /api/orders` | log an order event; attaches the dish to its query log |
| `GET /api/favorites/:userId`, `POST /api/favorites`, `DELETE /api/favorites/:userId/:menuItemId` | favorites (starred from result cards) |
| `GET /api/query-logs` (`?format=csv`), `PATCH /api/query-logs/:id` | weekly log review + spreadsheet export (also at `/admin/query-logs` in the app) |

## Matching

Pure math, no AI at request time. Each dish is scored by weighted distance from the user's targets with a ±10% tolerance band; only attributes the user actually specified count. Hard filters: protein source, diet pattern, allergy/dislike exclusions — profile allergies apply automatically on every search without being restated. When zero dishes land inside the band, it widens automatically (±25%, then ±50%), the UI says the filters were loosened, and each result is flagged as outside the original request. A known location first trims the pool to restaurants within 4 miles. See `server/lib/score.js` and `server/lib/geo.js`.

## Fuzzy query parsing (Phase 3)

`server/data/fuzzy_terms.json` maps vague phrases to filter defaults ("light" → calorie ceiling 500, "quick bite" → price ceiling $10, …). The parsing prompt reads the table plus four worked examples; explicit numbers always override table defaults, and phrases that match nothing leave the filter null so scoring skips the attribute. Every query is logged (raw query, parsed filters, selected dish, timestamp). Review the logs weekly at `/admin/query-logs` (or export CSV), add missed phrases to the table, and add a prompt example if a miss repeats — the loop trains the prompt, not the model.

## Notes

- Without Firebase, user accounts, orders, favorites, and query logs are stored in `server/data/runtime/` (gitignored). The fallback auth is demo-grade — do not reuse real passwords.
- Nutrition values are AI estimates, flagged "estimated" everywhere they appear — not restaurant-verified.
- DoorDash has no generally available public read API for menus, so the dataset is maintained by hand. Order links are DoorDash search links; revisit live integration when DoorDash Marketplace read endpoints reach general availability.
