# SMS Dashboard — Documentation

This document summarizes the schema definitions, API endpoints (CRUD), and client UI components implemented in this repository.

---

**Schemas (MongoDB / Mongoose models)**

- `RawMessage`
  - Fields:
    - `text` (String, required) — raw SMS text
    - `source` (String, default: `manual`) — origin label
    - `createdAt` (Date, default: now)

- `ParsedMessage`
  - Fields:
    - `rawMessageId` (ObjectId, ref: `RawMessage`) — relation to raw message
    - `company` (String)
    - `receipt` (String)
    - `gross` (Number)
    - `tare` (Number)
    - `net` (Number)
    - `vehicle` (String)
    - `product` (String)
    - `party` (String)
    - `location` (String)
    - `dates` ([String])
    - `pricePerKg` (Number, default: 0)
    - `value` (Number, default: 0)
    - `createdAt` (Date, default: now)

- `Vendor`
  - Fields:
    - `name` (String, required)
    - `location` (String, default: '')
    - `createdAt` (Date, default: now)

- `Pricing`
  - Fields:
    - `product` (String, required, unique)
    - `pricePerKg` (Number, required)
    - `createdAt` (Date, default: now)

Notes: `ParsedMessage.rawMessageId` references `RawMessage._id`. `ParsedMessage` documents are created/updated by `storeMessage()` (server) or the `reparse.js` utility.

---

**Server-side parsing / helpers**

- `parseMessage(text)` — normalises and extracts fields (company, receipt, gross/tare/net, vehicle, product, party, location, dates) from free-form text.
- `storeMessage(text, source)` — creates `RawMessage`, looks up pricing by product, computes `value`, and creates `ParsedMessage`. Skips duplicates if exact `text` exists.
- `reparse.js` — script to (re-)parse all `RawMessage` documents and create/update `ParsedMessage` entries.

---

**API endpoints (server routes)**

Auth
- `POST /auth/login` — body `{ username, password }`. Uses in-memory credentials (`admin` / `admin123` by default) and `express-session` for session auth. Returns `{ ok: true }` on success.
- `POST /auth/logout` — destroys session.
- `GET /auth/me` — returns `{ user: <username|null> }`.

Messages / Parsing
- `POST /messages` — body `{ text, source? }`. Parses and stores raw + parsed. Returns `201` with `{ raw, parsed }` or `400` on parse error.
- `GET /messages` — returns list of `RawMessage` sorted by `createdAt` desc.
- `GET /parsed` or `GET /processed` — returns list of `ParsedMessage` sorted by `createdAt` desc.
- `POST /messages/parse` — body `{ text }`. Dry-run parse only; returns parsed object (no DB write).

Vendors
- `POST /vendors` — body `{ name, location? }`. Creates a `Vendor` (requires `name`). Returns `201` on success.
- `GET /vendors` — list vendors sorted by name.

Pricing
- `POST /pricing` — body `{ product, pricePerKg }`. Upserts a `Pricing` entry (create or update). Returns the pricing doc.
- `GET /pricing` — list pricing entries sorted by product.

Upload / Bulk
- `POST /upload` — protected by session (`requireAuth`) and accepts a multipart `file` (field name `file`). Accepts either:
  - JSON array (each item either a string or `{ text }` object), or
  - Plain text separated by blank lines.
  Processes messages via `storeMessage()`, returns stats: `{ processed, duplicates, skipped, results }`.

Analytics & Misc
- `GET /analytics` — aggregates parsed messages and returns `{ messageCount, totalWeight, totalValue }`.
- `GET /health` — basic health check: `{ status: 'ok', db: 'connected'|'disconnected' }`.

Notes on auth & protection:
- `POST /upload` uses `requireAuth` middleware. The server sets a session cookie; client requests use `credentials: 'include'`.

---

**Client (UI) — components and behavior**

All client UI is in `client/src/App.js` as a single-file app with multiple React components.

Components / hooks
- `GlobalStyle` — inline global CSS styles used across the app.
- `App` — root component. Checks session (`GET /auth/me`) and renders `Dashboard` or `Login`.
- `Dashboard` — top-level authenticated view; renders tab navigation and selected tab component. Tabs: `messages` (Register), `vendors`, `pricing`, `upload`, `analytics`.
- `Login` — sign-in form calling `POST /auth/login` and invoking `onLogin` on success.
- `useAnalytics()` — hook that fetches `/analytics` and returns `{ data, loading, error }`.
- `StatsBar`, `StatCard` — small components to display analytics metrics.
- `AnalyticsTab` — displays analytics summary using `useAnalytics`.
- `Messages` — fetches `/processed` (client uses `/processed` alias) and renders the register table, filtering by party/vehicle/receipt.
- `Vendors` — lists vendors (`GET /vendors`) and allows adding vendors (`POST /vendors`).
- `Pricing` — lists pricing (`GET /pricing`) and allows upserting product price (`POST /pricing`).
- `Upload` — file upload UI; posts multipart `file` to `/upload` (requires session). Shows upload result summary and triggers a refresh on success.
- `DataRow` — small row primitive used in analytics summary.

Design / Interaction notes
- Client uses `fetch` with `credentials: 'include'` to preserve session cookies.
- Default API root: `REACT_APP_API_URL` or `http://localhost:3003`.
- The UI is a single-file React app — styles and layout are inline via the `S` object and `GlobalStyle`.

---

**Where to look in the codebase**
- Server main: [server/server.js](server/server.js)
- Reparse utility: [server/reparse.js](server/reparse.js)
- Client app: [client/src/App.js](client/src/App.js)

---

If you'd like, I can:
- extract this document into a separate Markdown file (done),
- generate a concise ER diagram or Mermaid diagram of the models,
- produce an OpenAPI/Swagger spec for the routes,
- or split the client into component files.

Tell me which next step you want.
