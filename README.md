# Topsail Steamer — AI Operating System

A password-protected Next.js dashboard backed by Supabase. It provides a live Chamber Leads view, Content Calendar, Overview metrics, and a Review Replies placeholder marked Coming Soon.

## Local setup

1. Install Node.js LTS.
2. From the `topsail-dashboard` project root run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Set `SUPABASE_URL` and the server-only `SUPABASE_SECRET_KEY`.
5. Run `npm run dev` and open http://localhost:3000.

## Supabase tables

The dashboard expects your existing `public.Leads` table plus these tables for login and the calendar:

```sql
create table public.dashboard_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  password_hash text not null,
  created_at timestamptz default now()
);

create table public.content_calendar (
  id uuid primary key default gen_random_uuid(),
  date date, content_type text, title text, objective text, description text,
  related_event_or_occasion text, suggested_channel text, marketing_angle text,
  caption text, source_url text, brand_template_or_image text,
  approval_status text default 'Pending', approved_at timestamptz,
  graphic_url text, publish_status text default 'Not Published',
  published_at timestamptz, created_at timestamptz default now()
);
```

Sign-up is available at `/signup`; passwords are bcrypt-hashed before they are stored.

## Security

`SUPABASE_SECRET_KEY` is server-only. Do not put it in client-side code or commit `.env.local`. For production, use your hosting provider's environment-variable settings.

## Supabase dashboard setup

Run `supabase-dashboard-migration.sql` in the Supabase SQL Editor. This adds fields used by the Chamber Leads email viewer/editor:
- `welcome_email_subject`
- `welcome_email_body`
- `reminder_email_subject`
- `reminder_email_body`

The dashboard keeps `welcome_sent` and `reminder_sent` as explicit booleans and displays `True` / `False` instead of blank values.

The Chamber Leads page includes CSV export, search, status cards, and a Welcome/Reminder email editor. The editor stores the email content in Supabase. To make n8n send the edited content, have the Gmail nodes read the corresponding Supabase fields before sending and write the exact sent subject/body back to the lead.

## Automation 2 — Vendor Invoice Filing & Log

The project now includes `/dashboard/invoices` with:
- PDF/photo upload that forwards to the n8n invoice webhook. The intake accepts vendor invoice PDFs from supplier emails (e.g. Sysco/Bar Harbor), Publix receipt photos/PDFs from Nick, and dashboard uploads.
- Invoice Log, Review Queue, Item & Vendor Master, and rollup views.
- Review actions for `no_match` / `needs_review` rows.
- Master-data add forms for new items and vendors.

Run `automation-2-supabase.sql` first, then optionally `automation-2-historical-seed.sql` to load the 200 existing tracker lines used as the validation set. Import `automation-2-vendor-invoice-filing.json` into n8n and configure the Gmail credential plus the `GEMINI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` environment variables in n8n. The dashboard upload route uses `N8N_INVOICE_UPLOAD_WEBHOOK_URL`.

The workflow intentionally accepts attachments from Nick or supplier/store senders without hard-coding the sender as the gate, classifies documents before line extraction, supports scanned/multi-page PDFs and receipt images, skips AR/account statements, remittance notices, and freight-only/no-product documents, handles Publix receipts as a separate extraction path, applies vendor/item aliases and conversion rules, and writes one auditable row per invoice line into `vendor_invoice_log`. The real 2026-09-08 US Foods invoice #1279473 is included in `automation-2-test-case-2026-09-08.json` as the first validation case.

## Automation 3 — Inventory & Food Cost Forecasting

Run `automation-3-supabase.sql` in Supabase **after** Automation 2. It adds:

- `inventory_items` (synchronized from Automation 2 `item_master`)
- `item_unit_conversions`
- `monthly_food_cost`
- `food_cost_summary`
- `ingredient_forecast`
- `vendor_order_plan`
- `invoice_price_history` view for matched, unit-normalized price trends

The dashboard now has **Inventory & Forecast** at `/dashboard/inventory` with:

- Monthly close by item and category
- Physical ending-count entry (quantity only)
- Automatic ending-cost display from canonical unit cost
- Food Cost % vs the 32% guardrail
- Weekly ingredient forecast and vendor minimum checks

The **Vendor Invoices** screen now includes a **Price Intelligence** tab. Users can filter the invoice log by month and inspect monthly average/min/max unit cost by item and vendor. The chart only uses `matched` invoice lines so mixed-unit corrections and review rows do not silently distort the trend.

### Source alignment

The UI is intentionally aligned to the canonical August 2026 inventory workbook and the Seafood Ordering Model. The Lobster Tails Bar Harbor conversion (CS → EA, factor 19) is seeded in `automation-3-supabase.sql` from the 2026-09-01 correction.

## Automation 4 — Labor Cost Tracking & Growth Planning

Added files:
- `app/dashboard/labor/page.tsx` — Labor Cost & Growth UI route.
- `components/LaborCostOperations.tsx` — CSV upload, monthly tracker, employee detail, and growth-plan panels.
- `app/api/labor/upload/route.ts` — authenticated Homebase CSV upload endpoint.
- `lib/automation4.ts` — Supabase readers for `payroll_monthly`, `employee_labor_detail`, and `labor_growth_plan`.
- `automation-4-labor-cost-tracking.json` — n8n workflow blueprint.
- `automation-4-supabase-schema.sql` — Supabase tables for Automation 4.

Set `N8N_LABOR_UPLOAD_WEBHOOK_URL` in the environment. The UI sends the payroll month, CSV, payroll fees, manager allocation, and internal target percentage to the n8n webhook.


## Automation 1 — Google & BentoBox Review Reply Assistant

The dashboard now includes `/dashboard/reviews` for the Automation 1 workflow described in the build guide: Google reviews are collected by n8n every 4 hours, grounded with `business_context`, saved as `pending`, and held for human approval before Google posting. BentoBox stays on the manual path because the build guide documents no public BentoBox API.

Run `automation-1-supabase.sql` in Supabase before using the review page. The page supports an approval queue, Google/BentoBox filters, editable drafts, approve/reject actions, manual BentoBox intake, and direct editing of the `business_context` rows. This mirrors the guide's UI requirements for the original review, editable draft, approval controls, and business-context maintenance.

For optional AI drafting of manually entered BentoBox reviews, set `N8N_REVIEW_MANUAL_WEBHOOK_URL` to the webhook URL from the refined Automation 1 workflow. The dashboard never receives or exposes the n8n/Google/Supabase credentials in browser code.


## Automation 3 webhook integration

The dashboard now routes Automation 3 through server-side Next.js API routes:

- `POST /api/automation3/monthly-sales` -> n8n `monthly-sales`
- `POST /api/automation3/monthly-close` -> n8n `monthly-close`
- `POST /api/automation3/ending-inventory` -> n8n `ending-inventory`

The webhook URLs are stored in `.env.local` and are never exposed to browser code.

### Start locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and sign in.

### Start each n8n test webhook

Because the configured URLs use `/webhook-test/`, open the Automation 3 workflow in n8n and click **Execute Workflow** (or the equivalent test/listening control) before pressing the dashboard button. Keep the workflow listening while you send the request.

1. Select the month in **Inventory & Forecast**.
2. **Run Monthly Sales** sends `{ year, month }` to the Monthly Sales test webhook. The workflow can use Clover when no manual sales amount is supplied.
3. Enter physical ending quantities in the Ending Qty cells. Each save sends `{ year, month, item_name, category, ending_qty }` to the Ending Inventory test webhook.
4. After ending counts are complete, press **Run Monthly Close**. It sends `{ year, month }` to the Monthly Close test webhook.

### Production n8n URLs

The `/webhook-test/` URLs are for testing. After the workflow is activated in n8n, replace each environment variable with its production `/webhook/` URL, for example:

```text
https://n8n-97af.srv1958066.hstgr.cloud/webhook/topsail/automation3/monthly-sales
https://n8n-97af.srv1958066.hstgr.cloud/webhook/topsail/automation3/monthly-close
https://n8n-97af.srv1958066.hstgr.cloud/webhook/topsail/automation3/ending-inventory
```

Restart/redeploy the Next.js app after changing `.env.local`.
