# Nori

Tell it your macro and price goals in plain language. It searches nearby restaurant menus (mock Pittsburgh dataset for the MVP), estimates nutrition per dish, and returns ranked matches. Tap one, read why it matched, then order through Uber Eats.

## Stack

- **Frontend:** React + Tailwind CSS (Vite), in `client/`
- **Backend:** Node + Express, in `server/`
- **AI:** Claude Haiku 4.5 via the Anthropic API for query parsing and match explanations. Falls back to a built-in heuristic parser when no API key is set, so the app works offline too.
- **Data:** hand-written mock dataset — 21 dishes across 7 Pittsburgh restaurants (`server/data/`)
- **Auth:** local email/password for the MVP (scrypt-hashed, JSON store). The blueprint's Firebase Auth is a planned swap — the API surface (`/api/auth/*`) is already shaped for it.

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

Without a key, the server uses a deterministic keyword parser and template explanations. To use Claude Haiku 4.5:

```sh
# server/.env
ANTHROPIC_API_KEY=sk-ant-...
```

then restart the server. Get a key at https://platform.claude.com.

## API

| Endpoint | Purpose |
|---|---|
| `POST /api/parse-query` | free text → structured filter object |
| `POST /api/search` | filters → ranked dish list with match scores |
| `POST /api/refine` | adjusted filters → updated ranked list |
| `POST /api/explain` | dish id + original query → 2–3 sentence explanation |
| `POST /api/auth/signup`, `/api/auth/login` | account creation / login |
| `GET/PUT /api/profile/:userId` | fetch / update profile & preferences |
| `POST /api/orders` | log an order event |

## Matching

Pure math, no AI at request time. Each dish is scored by weighted distance from the user's targets with a ±10% tolerance band; only attributes the user actually specified count. Hard filters: protein source, diet pattern, allergy/dislike exclusions. See `server/lib/score.js`.

## Notes

- User accounts and orders are stored in `server/data/runtime/` (gitignored). Auth is demo-grade — do not reuse real passwords.
- Nutrition values are AI-style estimates, not restaurant-verified.
- Uber Eats links are search deep links (no public Uber Eats API exists).
