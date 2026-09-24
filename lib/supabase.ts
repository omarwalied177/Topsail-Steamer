const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

function getConfig() {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY are not set. See .env.example.");
  }
  return { url: SUPABASE_URL.replace(/\/$/, ""), key: SUPABASE_SECRET_KEY };
}

export async function supabaseFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, key } = getConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase error (${response.status}): ${text || response.statusText}`);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export type Lead = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  discount_code: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  date_arrival: string | null;
  date_received: string | null;
  welcome_sent: boolean;
  reminder_sent: boolean | null;
  welcome_email_subject?: string | null;
  welcome_email_body?: string | null;
  reminder_email_subject?: string | null;
  reminder_email_body?: string | null;
  created_at?: string;
};

export type CalendarEntry = {
  id: string;
  date: string | null;
  content_type: string | null;
  title: string | null;
  objective: string | null;
  description: string | null;
  related_event_or_occasion: string | null;
  suggested_channel: string | null;
  marketing_angle: string | null;
  caption: string | null;
  source_url: string | null;
  brand_template_or_image: string | null;
  approval_status: string | null;
  approved_at: string | null;
  graphic_url: string | null;
  publish_status: string | null;
  published_at: string | null;
  created_at?: string;
};

export async function getLeads(): Promise<Lead[]> {
  return supabaseFetch<Lead[]>(
    "Leads?select=*&order=date_received.desc"
  );
}

export async function getCalendarEntries(): Promise<CalendarEntry[]> {
  return supabaseFetch<CalendarEntry[]>(
    "content_calendar?select=*&order=date.asc"
  );
}

export type VendorMaster = {
  id: string;
  vendor_name: string;
  notes: string | null;
};

export type ItemMaster = {
  id: string;
  category: string;
  item: string;
  count_by_unit: string;
  conversion_rules: Record<string, unknown> | null;
  invoice_name_aliases: string[] | null;
};

export type VendorInvoiceLog = {
  id: string;
  invoice_date: string | null;
  vendor: string | null;
  category: string | null;
  item: string | null;
  count_by: string | null;
  quantity: number | null;
  unit_cost: number | null;
  total_cost: number | null;
  invoice_number: string | null;
  notes: string | null;
  month: number | null;
  match_status: "matched" | "no_match" | "needs_review" | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  source_type: string | null;
};

export async function getInvoiceLog(): Promise<VendorInvoiceLog[]> {
  return supabaseFetch<VendorInvoiceLog[]>(
    "vendor_invoice_log?select=*&order=invoice_date.desc,created_at.desc"
  );
}

export async function getItemMaster(): Promise<ItemMaster[]> {
  return supabaseFetch<ItemMaster[]>(
    "item_master?select=id,category,item,count_by_unit,conversion_rules,invoice_name_aliases&order=item.asc"
  );
}

export async function getVendorMaster(): Promise<VendorMaster[]> {
  return supabaseFetch<VendorMaster[]>(
    "vendor_master?select=id,vendor_name,notes&order=vendor_name.asc"
  );
}

export async function createItemMaster(input: { item: string; category: string; count_by_unit: string; conversion_rules: Record<string, unknown>; invoice_name_aliases: string[] }): Promise<ItemMaster> {
  const rows = await supabaseFetch<ItemMaster[]>("item_master", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(input) });
  return rows[0];
}

export async function createVendorMaster(input: { vendor_name: string; notes: string | null }): Promise<VendorMaster> {
  const rows = await supabaseFetch<VendorMaster[]>("vendor_master", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(input) });
  return rows[0];
}

export async function updateInvoiceReview(id: string, matchStatus: "matched" | "no_match" | "needs_review", reviewedBy: string): Promise<void> {
  await supabaseFetch(`vendor_invoice_log?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ match_status: matchStatus, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() }),
  });
}

export type DashboardUser = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
};

export async function findDashboardUser(email: string): Promise<DashboardUser | null> {
  const rows = await supabaseFetch<DashboardUser[]>(
    `dashboard_users?select=*&email=eq.${encodeURIComponent(email.toLowerCase())}&limit=1`
  );
  return rows[0] ?? null;
}

export async function createDashboardUser(input: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<DashboardUser> {
  const rows = await supabaseFetch<DashboardUser[]>("dashboard_users", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      email: input.email.toLowerCase(),
      name: input.name,
      password_hash: input.passwordHash,
    }),
  });
  return rows[0];
}

export type EmailTemplate = {
  id: string;
  template_type: "welcome" | "reminder";
  subject: string;
  body: string;
  updated_at: string | null;
};

export async function getEmailTemplate(
  type: "welcome" | "reminder"
): Promise<EmailTemplate | null> {
  const rows = await supabaseFetch<EmailTemplate[]>(
    `email_templates?select=*&template_type=eq.${encodeURIComponent(type)}&limit=1`
  );
  return rows[0] ?? null;
}

export async function updateEmailTemplate(
  type: "welcome" | "reminder",
  subject: string,
  body: string
): Promise<EmailTemplate> {
  const rows = await supabaseFetch<EmailTemplate[]>(
    `email_templates?template_type=eq.${encodeURIComponent(type)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        subject,
        body,
        updated_at: new Date().toISOString(),
      }),
    }
  );
  if (!rows[0]) throw new Error("Email template was not found.");
  return rows[0];
}

export async function updateLeadEmail(
  id: string,
  type: "welcome" | "reminder",
  subject: string,
  body: string
): Promise<void> {
  const patch = type === "welcome"
    ? { welcome_email_subject: subject, welcome_email_body: body }
    : { reminder_email_subject: subject, reminder_email_body: body };
  await supabaseFetch(`Leads?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
}

export async function updateDiscountCode(code: string): Promise<void> {
  await supabaseFetch("Leads?discount_code=not.is.null", {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ discount_code: code }),
  });
}

export type ReviewReply = {
  id: string;
  platform: "google" | "bentobox";
  review_id: string;
  review_text: string;
  reviewer_name: string | null;
  rating: number | null;
  review_posted_at: string | null;
  draft_reply: string | null;
  status: string;
  approved_by: string | null;
  posted_at: string | null;
  turnaround_hours: number | null;
  location_id: string | null;
  created_at?: string | null;
  source?: string | null;
  reviewer_email?: string | null;
  email_message_id?: string | null;
  email_thread_id?: string | null;
  email_subject?: string | null;
  email_from?: string | null;
  order_number?: string | null;
  item_count?: number | null;
  order_total?: number | null;
  category_ratings?: Record<string, number> | null;
  feedback_summary?: string | null;
};

export type BusinessContext = {
  id: string;
  topic: string;
  guidance: string;
  updated_at: string | null;
};

export async function getReviewReplies(): Promise<ReviewReply[]> {
  return supabaseFetch<ReviewReply[]>(
    "review_replies?select=*&order=review_posted_at.desc,created_at.desc"
  );
}

export async function getBusinessContext(): Promise<BusinessContext[]> {
  return supabaseFetch<BusinessContext[]>(
    "business_context?select=*&order=topic.asc"
  );
}

export async function createBusinessContext(input: { topic: string; guidance: string }): Promise<BusinessContext> {
  const rows = await supabaseFetch<BusinessContext[]>("business_context", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ topic: input.topic, guidance: input.guidance, updated_at: new Date().toISOString() }),
  });
  return rows[0];
}

export async function updateBusinessContext(id: string, topic: string, guidance: string): Promise<BusinessContext> {
  const rows = await supabaseFetch<BusinessContext[]>(`business_context?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ topic, guidance, updated_at: new Date().toISOString() }),
  });
  if (!rows[0]) throw new Error("Business context row was not found.");
  return rows[0];
}

export async function createReviewReply(input: {
  platform: "google" | "bentobox";
  review_id: string;
  review_text: string;
  reviewer_name: string | null;
  rating: number | null;
  review_posted_at: string;
  draft_reply: string | null;
  status: string;
  location_id?: string | null;
}): Promise<ReviewReply> {
  const rows = await supabaseFetch<ReviewReply[]>("review_replies", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(input),
  });
  return rows[0];
}

export async function updateReviewReply(id: string, patch: Partial<Pick<ReviewReply, "draft_reply" | "status" | "approved_by">>): Promise<ReviewReply> {
  const rows = await supabaseFetch<ReviewReply[]>(`review_replies?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!rows[0]) throw new Error("Review was not found.");
  return rows[0];
}

export async function getReviewReply(id: string): Promise<ReviewReply> {
  const rows = await supabaseFetch<ReviewReply[]>(`review_replies?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
  if (!rows[0]) throw new Error("Review was not found.");
  return rows[0];
}
