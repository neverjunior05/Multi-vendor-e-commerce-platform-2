# Bazaario — multi-vendor marketplace (React · Next.js REST API · PostgreSQL · JWT)

A full-stack, role-based marketplace where **many vendors** list products and **customers** buy from all
of them in a single cart. Ships with customer / vendor / admin roles, JWT auth with bcrypt,
vendor approval workflow, image uploads, sandbox payments and a persistent per-user cart.

> **Demo accounts** (seeded automatically on first boot) — password for all: `Password123!`
>
> | Role | Email | Lands on |
> |---|---|---|
> | Admin | `admin@bazaario.dev` | `/admin` |
> | Vendor | `maya@bazaario.dev` | `/vendor` |
> | Customer | `customer@bazaario.dev` | `/products` |

---

## 1. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **React 19** + Next.js App Router | Client components for interactive UI, server components for SEO pages |
| Routing | **Next.js App Router** (file-system router) | Replaces React Router; `/products/[id]`, `/vendors/[slug]`, … |
| HTTP client | **Axios** (`src/lib/api-client.ts`) | Interceptors attach the JWT and normalise errors |
| State | **React Context API** | `AuthContext` + `CartContext` (no Redux needed) |
| Backend | **Node.js REST API** via Next.js Route Handlers (`src/app/api/**`) | Same controller/route split as Express — see §3 |
| Styling | **Tailwind CSS v4** | Design tokens in `src/app/globals.css` |
| Fonts | **Plus Jakarta Sans** (body/UI/prices) + **Sora** (headings) | |
| Database | **PostgreSQL** + **Drizzle ORM** | Relational model chosen for order/transaction integrity |
| Auth | **JWT** (`jsonwebtoken`) + **bcrypt** (`bcryptjs`) | Role embedded in the signed payload |
| Uploads | Route Handler `formData()` → `/public/uploads` | The Next equivalent of `multer.diskStorage` |
| Payments | **Sandbox only** | Stripe *test mode* if `STRIPE_SECRET_KEY` is set, else a built-in simulator |

### Design language
Neutral warm-white base, **one bold accent: burnt orange `#F97316`**, plus status colours —
Approved/Active `#10B981`, Pending `#F59E0B`, Rejected/Cancelled `#F5484B`. No blue or purple anywhere.

---

## 2. Folder structure

```
bazaario/
├─ src/
│  ├─ app/                         # "frontend" pages + "backend" REST layer
│  │  ├─ page.tsx                  # Home (SSR: featured products, vendors, categories)
│  │  ├─ products/page.tsx         # Catalogue with search / category / price filters
│  │  ├─ products/[id]/page.tsx    # Product detail + reviews (SSR)
│  │  ├─ vendors/page.tsx          # Approved vendor directory
│  │  ├─ vendors/[slug]/page.tsx   # Vendor storefront
│  │  ├─ cart/page.tsx             # Cart
│  │  ├─ checkout/page.tsx         # Address + sandbox payment
│  │  ├─ orders/page.tsx           # Order history
│  │  ├─ orders/[id]/page.tsx      # Order detail (server-side ownership check)
│  │  ├─ login, signup             # Auth screens (role picker)
│  │  ├─ vendor/page.tsx           # Vendor dashboard (client)
│  │  ├─ admin/page.tsx            # Admin panel (client)
│  │  │
│  │  └─ api/                      # ====== BACKEND (Express-style REST) ======
│  │     ├─ auth/signup|login|logout|me/route.ts
│  │     ├─ products/route.ts, products/[id]/route.ts
│  │     ├─ cart/route.ts
│  │     ├─ orders/route.ts
│  │     ├─ vendors/route.ts, vendors/me/route.ts
│  │     ├─ admin/overview/route.ts, admin/users/route.ts
│  │     ├─ reviews/route.ts
│  │     ├─ uploads/route.ts       # multipart upload (multer equivalent)
│  │     ├─ categories/route.ts
│  │     └─ health/route.ts        # healthcheck + first-boot seed
│  │
│  ├─ components/                  # Reusable UI
│  │  ├─ site-header.tsx  product-card.tsx  products-browser.tsx
│  │  ├─ vendor-dashboard.tsx      # Products CRUD + orders + stats
│  │  ├─ admin-panel.tsx           # Moderation tables
│  │  └─ ui.tsx                    # Button / Card / Stat / StatusPill / Field …
│  │
│  ├─ context/
│  │  ├─ AuthContext.tsx           # login / signup / logout / hasRole
│  │  └─ CartContext.tsx           # DB cart when signed in, localStorage for guests
│  │
│  ├─ lib/                         # "backend/services" + shared helpers
│  │  ├─ auth.ts                   # ★ bcrypt + JWT + requireAuth() role middleware
│  │  ├─ http.ts                   # json/created/fail + handle() error wrapper
│  │  ├─ queries.ts                # all SQL queries (products, carts, orders, stats)
│  │  ├─ payments.ts               # sandbox gateway (Stripe test mode optional)
│  │  ├─ api-client.ts             # axios instance
│  │  ├─ types.ts                  # shared API types
│  │  └─ format.ts                 # money / date / slug helpers
│  │
│  └─ db/
│     ├─ schema.ts                 # Drizzle tables: users, vendors, products, orders…
│     ├─ index.ts                  # pg Pool + drizzle client
│     └─ seed.ts                   # idempotent demo data
│
├─ public/uploads/                 # uploaded product images land here
├─ .env.example
└─ drizzle.config.json
```

> In a classic split repo this maps to `frontend/src/{components,context,pages}` and
> `backend/src/{routes,controllers,middleware,models}`. Here the Next.js route handlers *are*
> the routes+controllers, `src/lib/*` holds the middleware/services, and `src/db/schema.ts`
> replaces the Mongoose models.

---

## 3. Setup

```bash
# 1 — install
npm install

# 2 — configure
cp .env.example .env
#    then set DATABASE_URL and JWT_SECRET (see .env.example)

# 3 — create the tables
npx drizzle-kit push

# 4 — run
npm run dev            # http://localhost:3000  (API + frontend together)
# or
npm run build && npm run start
```

First request to `/` or `/api/health` seeds 6 vendors, ~20 products, reviews and 2 historic
orders so nothing is empty. Seeding is idempotent — it only writes when `users` is empty.

### Manual seed / reset (optional)
```bash
psql "$DATABASE_URL" -c 'TRUNCATE users CASCADE;'   # wipe, then hit / to reseed
```

---

## 4. API documentation

Auth = JWT sent as `Authorization: Bearer <token>` **or** the `bazaario_token` httpOnly cookie.
Roles: 🌐 public · 🔑 any signed-in user · 🛍️ customer · 🧑‍🏭 vendor · 🛡️ admin.

| Method | Route | Role | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | 🌐 | Create account. `role: "vendor"` also opens a **pending** store application |
| POST | `/api/auth/login` | 🌐 | Returns `{ token, user }` + sets the httpOnly cookie |
| POST | `/api/auth/logout` | 🔑 | Clears the cookie |
| GET | `/api/auth/me` | 🌐 | Live session (`{ user: null }` for guests) |
| GET | `/api/products` | 🌐 | Catalogue. `?q=&category=&vendor=&min=&max=&sort=&page=&limit=` |
| GET | `/api/products?mine=1` | 🧑‍🏭 | The vendor's own listings (any status) |
| POST | `/api/products` | 🧑‍🏭 (approved) | Create product — pending stores get **403** |
| GET | `/api/products/:id` | 🌐 | Product detail incl. reviews + vendor |
| PUT | `/api/products/:id` | 🧑‍🏭 owner / 🛡️ | Update (`assertOwnership` blocks other vendors) |
| DELETE | `/api/products/:id` | 🧑‍🏭 owner / 🛡️ | Soft delete → `status = "removed"` |
| GET | `/api/categories` | 🌐 | Categories with live product counts |
| GET | `/api/cart` | 🔑 | The user's cart (auto-created) |
| POST | `/api/cart` | 🔑 | Add `{ productId, quantity }` or `merge: [...]` on login |
| PATCH | `/api/cart` | 🔑 | Set quantity (`0` removes) |
| DELETE | `/api/cart?productId=` | 🔑 | Remove one line, or clear all |
| POST | `/api/orders` | 🔑 | Checkout: address + card → charge → order in a **transaction** |
| GET | `/api/orders` | 🔑 | My order history (with line items) |
| GET | `/api/orders?scope=vendor` | 🧑‍🏭 | Order lines that contain **my** products |
| PATCH | `/api/orders?id=&status=` | 🧑‍🏭 / 🛡️ | Advance fulfilment; only admin may `cancelled` (restocks) |
| GET | `/api/vendors` | 🔑 | Approved stores (`?all=1` for admin) |
| POST | `/api/vendors` | 🔑 | Submit a vendor application (status `pending`) |
| PATCH | `/api/vendors` | 🛡️ | `{ vendorId, status }` → approve / reject (demotes on reject) |
| GET | `/api/vendors/me` | 🧑‍🏭 | Store + stats + products + orders for the dashboard |
| GET | `/api/admin/overview` | 🛡️ | Platform metrics + all users/vendors/products/orders |
| PATCH | `/api/admin/users` | 🛡️ | Block / unblock an account (instant, see §5) |
| POST | `/api/reviews` | 🔑 | Upsert one review per user per product |
| POST | `/api/uploads` | 🧑‍🏭 (approved) | `multipart/form-data` `file` → `/uploads/<name>` (4MB cap) |
| GET | `/api/health` | 🌐 | DB ping + seed check |

Error shape is always `{ "error": "message" }` with a meaningful status:
`400` validation · `401` unauthenticated · `403` wrong role / unapproved store / not owner ·
`402` payment declined · `404` missing · `409` stock conflict · `413/415` upload rejects.

### Sandbox payments
| Card | Result |
|---|---|
| `4242 4242 4242 4242` | ✅ approved (visa) |
| `5555 5555 5555 4444` | ✅ approved (mastercard) |
| `4000 0000 0000 0002` | ❌ declined (`card_declined`) |

Set `STRIPE_SECRET_KEY` (test key) and the same checkout calls Stripe PaymentIntents instead of
the simulator — the rest of the flow is unchanged. **No real money is ever involved.**

---

## 5. How the auth + role checking works  (`src/lib/auth.ts`)

```
signup  → bcrypt.hash(password, 10) → users.password_hash
login   → bcrypt.compare → jwt.sign({ sub, email, role }, JWT_SECRET, { expiresIn: "7d" })
request → requireAuth(req, ["vendor"]) →
            1. read token (Authorization header, else httpOnly cookie)
            2. jwt.verify  → signature + expiry (tamper ⇒ 401)
            3. SELECT user → 404/401 if gone, 401 if isBlocked
            4. role ∉ allow-list ⇒ 403
            5. attach { user, vendor } to the handler
```

* **401 vs 403** — 401 = "I don't know who you are", 403 = "I know you, and you still can't".
* The **role lives inside the signed payload**, so clients can't forge it; the DB row is still
  re-read so blocking or demoting a user takes effect on their *next* request, not in 7 days.
* `requireApprovedVendor()` adds a second gate: a vendor whose application is still `pending`
  gets 403 from `POST /api/products` even though their role is `vendor`.
* `assertOwnership(vendorId, vendor, role)` guarantees vendor A can never edit vendor B's rows.
* Order reads re-check ownership server-side (`/orders/[id]`): buyer or admin only.

---

## 6. Database schema

```
users        id, name, email UNIQUE, password_hash, role(customer|vendor|admin),
             phone, is_blocked, created_at
vendors      id, user_id → users, store_name, slug UNIQUE, tagline, description, city,
             logo_url, status(pending|approved|rejected), reviewed_at, created_at
categories   id, name, slug UNIQUE, emoji
products     id, vendor_id → vendors, category_id → categories, title, slug, description,
             price_cents, compare_at_cents, stock, images JSONB,
             attributes JSONB,        -- ← flexible per-category specs, no migration
             status(active|draft|removed), created_at
reviews      id, product_id, user_id, rating(1-5), comment, created_at
             UNIQUE(product_id, user_id)
carts        id, user_id UNIQUE, created_at
cart_items   id, cart_id → carts, product_id → products, quantity
             UNIQUE(cart_id, product_id)
orders       id, user_id → users, status(pending|paid|shipped|delivered|cancelled),
             subtotal_cents, shipping_cents, total_cents,
             ship_name, ship_phone, ship_line1, ship_city, ship_postal, ship_country, note,
             payment_ref, payment_brand, paid_at, created_at
order_items  id, order_id → orders, product_id, vendor_id, title, image,
             unit_price_cents, quantity      -- price/title snapshot + denormalised vendor_id
```

Why money as integer cents: no floating-point drift. Why `attributes` as JSONB: a vase needs
*Material / Height*, a plant needs *Light / Water / Pet-safe* — a NoSQL-ish escape hatch inside a
relational core. Why `order_items` copies `title`/`unitPriceCents`: a vendor can change or delete
a product later without rewriting history.

---

## 7. Future improvements

- **Real payment gateway** — Stripe Connect destination charges so each vendor is paid out directly,
  plus webhooks instead of trusting the synchronous capture.
- **Product reviews/ratings v2** — "verified purchase" flag, photo reviews, vendor replies, review moderation queue.
- **Search with Elasticsearch / Meilisearch** — typo tolerance, facets, vector search over descriptions.
- **Vendor payouts & commission** — platform fee ledger, monthly statements, invoice PDFs.
- **Inventory & variants** — sizes/colours as separate SKUs, reservations with TTL, back-in-stock alerts.
- **Notifications** — transactional email (order confirmation, "vendor approved") via Resend/SES.
- **Real image pipeline** — Cloudinary/S3 with on-upload resize, AVIF variants and signed uploads.
- **Rate limiting & hardening** — per-IP throttling, refresh-token rotation, 2FA for admins, audit log.
- **Testing** — Vitest unit tests for `lib/auth`, Supertest-style route tests, Playwright checkout E2E.
- **Observability** — structured logs, OpenTelemetry traces, Sentry, admin sales charts over time.
- **Multi-currency & i18n** — locale-aware pricing, translated vendor content.
