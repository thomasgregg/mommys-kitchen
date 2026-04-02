# Mommy's Kitchen

Production-style monorepo for a backend-first food ordering system built around one rule:

> The database is the source of truth. Push notifications are only signals.

This repo contains:
- `ios-app/`: native SwiftUI customer app for iPhone
- `admin-web/`: Next.js admin dashboard for kitchen staff
- `supabase/`: Postgres schema, RLS, seed data, realtime publication, and edge functions

## Architecture Overview

### Core principles
- Every important action writes to Postgres first.
- The iOS app reads backend state directly and never trusts push payloads as business state.
- Order creation and status transitions happen through edge functions, not direct client table writes.
- Push is sent directly through APNs, with notification attempts logged in the `notifications` table.

### Backend shape
- Supabase Auth handles customer and admin authentication.
- `profiles` stores app roles and user metadata.
- `orders`, `order_items`, and `order_status_history` provide auditable lifecycle tracking.
- RLS protects all user-scoped data.
- Edge functions handle privileged workflows:
  - `create-order`
  - `update-order-status`
  - `register-device-token`
- `supabase_realtime` publication is configured for orders, status history, and menu tables.

### Frontend shape
- SwiftUI iOS app uses MVVM-style feature modules with repositories and services.
- Local cart state stays on device until checkout.
- Checkout posts cart contents to the backend and renders the server-confirmed order.
- Active orders are refreshed from the backend on an interval; the push payload only helps focus the relevant order.

### Admin shape
- Next.js app router dashboard with server-rendered pages.
- Admin access is enforced by Supabase Auth plus `profiles.role = 'admin'`.
- Order status changes call the Supabase edge function so the same state machine is enforced everywhere.
- Menu edits go directly to menu tables through authenticated admin RLS policies.

## Project Tree

```text
.
├── README.md
├── .gitignore
├── admin-web
│   ├── .env.example
│   ├── app
│   │   ├── (auth)
│   │   │   └── login
│   │   │       └── page.tsx
│   │   ├── (dashboard)
│   │   │   ├── layout.tsx
│   │   │   ├── menu
│   │   │   │   └── page.tsx
│   │   │   └── orders
│   │   │       ├── [id]
│   │   │       │   └── page.tsx
│   │   │       ├── history
│   │   │       │   └── page.tsx
│   │   │       └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components
│   │   ├── auth/login-form.tsx
│   │   ├── layout/sidebar.tsx
│   │   ├── menu/menu-item-form.tsx
│   │   ├── orders/order-card.tsx
│   │   ├── orders/status-action-form.tsx
│   │   └── ui/submit-button.tsx
│   ├── lib
│   │   ├── actions
│   │   │   ├── auth.ts
│   │   │   ├── menu.ts
│   │   │   └── orders.ts
│   │   ├── auth/require-admin.ts
│   │   ├── supabase
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── types/app.ts
│   │   └── utils/currency.ts
│   ├── next.config.ts
│   ├── next-env.d.ts
│   ├── package.json
│   ├── public
│   └── tsconfig.json
├── ios-app
│   ├── Configs
│   │   ├── Debug.xcconfig
│   │   └── Release.xcconfig
│   ├── MommysKitchen
│   │   ├── App
│   │   │   ├── AppContext.swift
│   │   │   ├── AppDelegate.swift
│   │   │   └── MommysKitchenApp.swift
│   │   ├── Core
│   │   │   ├── Config/AppConfig.swift
│   │   │   ├── Extensions/JSONDecoder+App.swift
│   │   │   ├── Models
│   │   │   │   ├── CartModels.swift
│   │   │   │   ├── MenuModels.swift
│   │   │   │   ├── OrderModels.swift
│   │   │   │   └── Profile.swift
│   │   │   ├── Repositories
│   │   │   │   ├── MenuRepository.swift
│   │   │   │   ├── OrderRepository.swift
│   │   │   │   └── ProfileRepository.swift
│   │   │   ├── Services
│   │   │   │   ├── AuthManager.swift
│   │   │   │   ├── PushNotificationManager.swift
│   │   │   │   └── SupabaseService.swift
│   │   │   └── Utilities/Formatters.swift
│   │   ├── Features
│   │   │   ├── Auth/AuthFeature.swift
│   │   │   ├── Cart/CartFeature.swift
│   │   │   ├── Menu/MenuFeature.swift
│   │   │   ├── Orders/OrdersFeature.swift
│   │   │   └── Profile/ProfileFeature.swift
│   │   ├── Resources
│   │   │   ├── Assets.xcassets
│   │   │   ├── Info.plist
│   │   │   └── MommysKitchen.entitlements
│   │   └── UI
│   │       ├── Components/CommonComponents.swift
│   │       └── Theme/KitchenTheme.swift
│   └── project.yml
└── supabase
    ├── config.toml
    ├── functions
    │   ├── _shared
    │   │   ├── cors.ts
    │   │   ├── apns.ts
    │   │   ├── orders.ts
    │   │   └── supabase.ts
    │   ├── create-order/index.ts
    │   ├── delete-account/index.ts
    │   ├── register-device-token/index.ts
    │   └── update-order-status/index.ts
    ├── migrations
    │   ├── 001_initial_schema.sql
    │   ├── 002_rls_policies.sql
    │   └── 003_realtime_publication.sql
    └── seed/seed.sql
```


## Deployment

For the production-ready web and backend workflow, see:
- [/Users/thomas.gregg/Documents/MommysKitchen/docs/deploying-web-and-backend.md](/Users/thomas.gregg/Documents/MommysKitchen/docs/deploying-web-and-backend.md)

Recommended setup:
- GitHub for source control and CI
- Vercel for `admin-web`
- Supabase GitHub integration for migrations and edge functions
- GitHub Actions for checks only

## Local Setup

### 1. Supabase

Install the Supabase CLI, then from the repo root:

```bash
cd supabase
supabase start
supabase db reset --local
```

That applies:
- schema
- RLS policies
- realtime publication migration
- seed data

If you want to seed again after a full reset, run:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f seed/seed.sql
```

### 2. Create an admin account

1. Create a user in Supabase Auth.
2. Promote that profile to admin:

```sql
update public.profiles
set role = 'admin'
where id = '<auth-user-uuid>';
```

### 3. Configure the admin dashboard

```bash
cd admin-web
cp .env.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Run it:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Configure the iOS app

Update:
- `ios-app/Configs/Debug.xcconfig`
- `ios-app/Configs/Release.xcconfig`

Set:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Generate the Xcode project:

```bash
cd ios-app
xcodegen generate
```

Then open `ios-app/MommysKitchen.xcodeproj` in Xcode.

## Apple Push Notifications (APNs)

### Apple Developer setup
1. Create an App ID for the customer app bundle identifier:
   - `com.mommyskitchen.app`
2. Enable:
   - `Push Notifications`
3. Create an APNs Auth Key (`.p8`) in Apple Developer.
4. Keep:
   - `Team ID`
   - `Key ID`
   - the full `.p8` private key contents

### iOS app setup
The iOS target uses native APNs delivery and expects:
- `Push Notifications`
- `aps-environment`
- `Background Modes -> Remote notifications`

For local development with XcodeGen:
- `ios-app/project.yml` configures the target capabilities
- `ios-app/MommysKitchen/Resources/MommysKitchen.entitlements` carries the APNs entitlement

### Supabase secrets for server-side APNs sending

Set these in Supabase for the edge functions:

```bash
supabase secrets set \
  APNS_TEAM_ID=your-apple-team-id \
  APNS_KEY_ID=your-apns-key-id \
  APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" \
  APNS_CUSTOMER_BUNDLE_ID=com.mommyskitchen.app \
  APNS_MOMMY_BUNDLE_ID=com.mommyskitchen.mommy
```

These are used by `supabase/functions/_shared/apns.ts` to call Apple Push Notification service directly.

## Running the System

### Run Supabase functions locally

From `supabase/`:

```bash
supabase functions serve create-order --no-verify-jwt
supabase functions serve delete-account --no-verify-jwt
supabase functions serve update-order-status --no-verify-jwt
supabase functions serve register-device-token --no-verify-jwt
```

For real authenticated local testing, prefer the normal `supabase start` stack and invoke the functions through the app/admin with JWT verification enabled.

### Deploy edge functions

```bash
cd supabase
supabase functions deploy create-order
supabase functions deploy delete-account
supabase functions deploy update-order-status
supabase functions deploy register-device-token
```

Deploy database changes with:

```bash
supabase db push
```

## Secrets and Config Locations

- Supabase URL / anon key for iOS: `ios-app/Configs/*.xcconfig`
- Supabase URL / anon key for admin web: `admin-web/.env.local`
- APNs secrets for push sending: Supabase Edge Function secrets
- Apple app signing and APNs key: Apple Developer

## Order State Machine

Implemented transitions:
- `placed -> accepted | rejected | cancelled`
- `accepted -> preparing | cancelled`
- `preparing -> ready | cancelled`
- `ready -> completed`
- terminal: `completed`, `cancelled`, `rejected`

Every successful transition:
- updates the `orders` row
- inserts an `order_status_history` row
- optionally sends a push
- logs notification attempts in `notifications`

Note: to satisfy the product rule that customers may cancel a newly placed order, `update-order-status` allows a customer to move only their own `placed` order to `cancelled`. All other transitions remain admin-only.

## Production Hardening Still To Do

1. Add payment processing and payment-intent/order reconciliation.
2. Move the iOS app from interval refresh to direct Supabase Realtime subscriptions for the focused active order.
3. Add image upload flows backed by Supabase Storage instead of raw image URLs.
4. Add analytics, crash reporting, and structured server-side logging.
5. Add test coverage across SQL functions, edge functions, Swift repositories/view models, and Next.js server actions.
6. Add CI for migrations, type-checking, linting, and edge function validation.
7. Add stronger admin auditing for menu edits and manual cancellations.
8. Add environment-specific bundle IDs, signing, and APNs entitlements for staging vs production.
