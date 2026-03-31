# Deploying Admin Web And Backend

This project works best with one simple rule:

- GitHub is the source of truth
- Vercel deploys `admin-web`
- GitHub Actions deploys Supabase schema, seed data, functions, and the first admin bootstrap
- GitHub Actions also runs checks before merge

That gives you automatic preview deploys for the web app, automatic production bootstrapping for the backend, and a clean separation between web hosting and backend infrastructure.

## Recommended Branch Flow

- `main`: production
- feature branches / pull requests: preview

Recommended behavior:
- open a PR -> Vercel creates a preview deployment for `admin-web`
- merge to `main` -> Vercel deploys production admin UI
- merge to `main` -> GitHub Actions applies production migrations, seed data, edge functions, and the admin bootstrap
- GitHub Actions blocks broken builds before merge

## Step 1: Create Hosted Supabase Projects

Start with at least these two hosted Supabase projects:

- `mommys-kitchen-staging`
- `mommys-kitchen-production`

Why two projects:
- Vercel `Preview` can safely point at staging
- Vercel `Production` can point at production
- you avoid accidental production writes from preview builds

## Step 2: Configure Supabase Production

In the Supabase dashboard for your production project:

### 2.1 Auth URL configuration

Go to:
- `Authentication`
- `URL Configuration`

Set:
- `Site URL`: your production Vercel URL
  - example: `https://mommys-kitchen-abc123.vercel.app`

Add redirect URLs:
- `https://mommys-kitchen-abc123.vercel.app/auth/callback`
- `https://*.vercel.app/auth/callback`
- `mommyskitchen://auth/callback`

If Vercel gives you a different production URL, use that exact domain.

### 2.2 Database

Your repo already contains migrations in `/supabase/migrations`, seed data in `/supabase/seed/seed.sql`, and an automated bootstrap workflow in `/.github/workflows/deploy-supabase-production.yml`.

You do **not** need to run one-off SQL manually if you set up the GitHub secrets in Step 6.

### 2.3 Edge Functions

This repo expects these functions to exist in production:
- `create-order`
- `update-order-status`
- `register-device-token`

Set any needed function secrets in Supabase before enabling production usage.

For push notifications, add the relevant secrets if you use them:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

If you later switch to direct APNs, set the APNs secrets instead.

## Step 3: Configure Supabase Staging

Repeat the same setup for your staging project:
- `Authentication > URL Configuration`
- add your Vercel preview callback URL support
- deploy the same migrations/functions

Suggested staging values:
- `Site URL`: your Vercel preview root or staging domain
- redirect URLs:
  - `https://*.vercel.app/auth/callback`
  - `mommyskitchen://auth/callback`

## Step 4: Create The Vercel Project

In Vercel:
- click `Add New...`
- choose `Project`
- import `thomasgregg/mommys-kitchen`

When prompted for project settings, use:
- `Framework Preset`: `Next.js`
- `Root Directory`: `admin-web`
- `Build Command`: `npm run build`
- `Install Command`: `npm install`
- `Output Directory`: leave default
- `Production Branch`: `main`

If you created Supabase through the Vercel marketplace integration, Vercel will usually auto-inject the Supabase environment variables into this project. You still need to verify them in the next step.

## Step 5: Add Or Verify Vercel Environment Variables

The admin app currently needs exactly these variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

If you used the Vercel Supabase integration, check whether they are already present under:

- `Project`
- `Settings`
- `Environment Variables`

If they are missing, add them manually for both environments:

### 6.1 Preview environment

Use the staging Supabase project values:
- `NEXT_PUBLIC_SUPABASE_URL`: staging project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: staging anon key
- `SUPABASE_SERVICE_ROLE_KEY`: staging service role key

### 6.2 Production environment

Use the production Supabase project values:
- `NEXT_PUBLIC_SUPABASE_URL`: production project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: production anon key
- `SUPABASE_SERVICE_ROLE_KEY`: production service role key

Important:
- `SUPABASE_SERVICE_ROLE_KEY` is only for server-side admin actions
- never expose it in client code or `.env.example` values beyond placeholders

## Step 6: Add GitHub Secrets For Backend Automation

In GitHub:
- open `thomasgregg/mommys-kitchen`
- go to `Settings`
- go to `Secrets and variables`
- open `Actions`
- add these repository secrets

Required:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ADMIN_EMAIL`
- `SUPABASE_ADMIN_PASSWORD`

Recommended:
- `SUPABASE_ADMIN_FULL_NAME`
- `SUPABASE_ADMIN_PHONE`

Use these values:
- `SUPABASE_ACCESS_TOKEN`
  - create in Supabase: `Account > Access Tokens`
- `SUPABASE_PROJECT_REF`
  - the short project ref from your hosted Supabase project URL
  - example: `jybglcycstgjwnyagztp`
- `SUPABASE_DB_PASSWORD`
  - the database password you chose when creating the hosted project
- `SUPABASE_SERVICE_ROLE_KEY`
  - from `Project Settings > API`
- `SUPABASE_ADMIN_EMAIL`
  - example: `admin@mommyskitchen.local`
- `SUPABASE_ADMIN_PASSWORD`
  - the password you want the first admin account to use
- `SUPABASE_ADMIN_FULL_NAME`
  - example: `Kitchen Admin`
- `SUPABASE_ADMIN_PHONE`
  - example: `555-0100`

What the workflow does on every `main` push:
- links to the hosted Supabase project
- applies migrations
- applies `seed.sql`
- deploys the three edge functions
- creates the admin auth user if missing
- forces that profile role to `admin`

The admin bootstrap is idempotent, so re-running it is safe.

## Step 7: Trigger The First Deploy

After Vercel is connected and environment variables are saved:

- trigger a deploy from Vercel or push to `main`
- open the production URL
- verify login works
- verify `Users & Roles`, `Menu`, `Categories`, `Orders`, and `Settings`
- in GitHub, open `Actions` and confirm `Deploy Supabase Production` passes once

## Step 8: Protect `main` In GitHub

In GitHub repo settings:
- open `Branches`
- add a branch protection rule for `main`

Recommended checks:
- require PR before merge
- require status checks to pass
- require `CI / Admin web build`
- require `CI / Supabase function typecheck`

## Step 9: Keep iOS Separate

The iOS app should not be deployed through Vercel.

Recommended iOS workflow:
- source in GitHub
- backend URLs/config point to staging or production Supabase
- distribution later via TestFlight

You can keep using:
- local development in Xcode
- manual release builds until you want Xcode Cloud or Fastlane

## What GitHub Actions Does Here

The repo includes:

- `/.github/workflows/ci.yml`
- `/.github/workflows/deploy-supabase-production.yml`

`ci.yml` does two things:
- builds `admin-web`
- typechecks Supabase edge functions

`deploy-supabase-production.yml` does production backend deployment and bootstrap.

That split is intentional.

Why:
- Vercel already handles Next.js deployments well
- GitHub Actions is a good place to make the Supabase production project self-healing
- it lets us automate schema + seed + auth bootstrap in one place

## Commands You May Still Use Manually

### Manually trigger the backend deploy workflow logic from your machine

```bash
cd /Users/thomas.gregg/Documents/MommysKitchen/supabase
supabase link --project-ref YOUR_PRODUCTION_PROJECT_REF -p YOUR_DB_PASSWORD
supabase db push --include-seed --include-all -p YOUR_DB_PASSWORD
supabase functions deploy create-order --project-ref YOUR_PRODUCTION_PROJECT_REF --use-api
supabase functions deploy update-order-status --project-ref YOUR_PRODUCTION_PROJECT_REF --use-api
supabase functions deploy register-device-token --project-ref YOUR_PRODUCTION_PROJECT_REF --use-api

cd /Users/thomas.gregg/Documents/MommysKitchen/admin-web
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY \
SUPABASE_ADMIN_EMAIL=admin@mommyskitchen.local \
SUPABASE_ADMIN_PASSWORD=YOUR_PASSWORD \
node ./scripts/bootstrap-admin.mjs
```

### Run admin locally

```bash
cd /Users/thomas.gregg/Documents/MommysKitchen/admin-web
npm install
npm run dev
```

### Run Supabase locally

```bash
cd /Users/thomas.gregg/Documents/MommysKitchen/supabase
supabase start
supabase db reset --local
```

## Env Variable Checklist

### Vercel Preview
- `NEXT_PUBLIC_SUPABASE_URL` = staging URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = staging anon key
- `SUPABASE_SERVICE_ROLE_KEY` = staging service role key

### Vercel Production
- `NEXT_PUBLIC_SUPABASE_URL` = production URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = production anon key
- `SUPABASE_SERVICE_ROLE_KEY` = production service role key

### Supabase Auth Redirects
- `https://admin.mommyskitchen.com/auth/callback`
- `https://*.vercel.app/auth/callback`
- `mommyskitchen://auth/callback`

## Recommended First Production Rollout

1. create staging and production Supabase projects
2. bootstrap production database/functions once
3. connect repo to Vercel with root directory `admin-web`
4. set Preview vars to staging Supabase
5. set Production vars to production Supabase
6. connect GitHub to Supabase
7. protect `main`
8. merge only through PRs

## Reference Docs

- [Vercel Git deployments](https://vercel.com/docs/deployments/git)
- [Vercel environments](https://vercel.com/docs/deployments/custom-environments)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Supabase GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration)
- [Supabase branching](https://supabase.com/docs/guides/deployment/branching)
- [Supabase auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase functions GitHub Actions example](https://supabase.com/docs/guides/functions/examples/github-actions)
