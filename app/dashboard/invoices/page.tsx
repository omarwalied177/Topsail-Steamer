import { getInvoiceLog, getItemMaster, getVendorMaster } from "@/lib/supabase";
import { SetupNeeded } from "@/components/SetupNeeded";
import { InvoiceOperations } from "@/components/InvoiceOperations";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  let error: string | null = null;
  let invoices: Awaited<ReturnType<typeof getInvoiceLog>> = [];
  let items: Awaited<ReturnType<typeof getItemMaster>> = [];
  let vendors: Awaited<ReturnType<typeof getVendorMaster>> = [];

  try {
    [invoices, items, vendors] = await Promise.all([
      getInvoiceLog(),
      getItemMaster(),
      getVendorMaster(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load invoice automation data.";
  }

  return (
    <div>
      <div className="page-heading invoice-heading">
        <div>
          <p className="eyebrow">People / Ops</p>
          <h2 className="font-display text-3xl" style={{ color: "var(--navy)" }}>Vendor Invoices</h2>
          <p className="page-subtitle">Upload a vendor invoice or receipt, match it against the master data, and keep an auditable invoice log for monthly food-cost close.</p>
        </div>
        <div className="automation-live-pill"><span className="status-dot" /> Live workflow</div>
      </div>

      {error ? <SetupNeeded message={error} /> : (
        <InvoiceOperations initialInvoices={invoices} initialItems={items} initialVendors={vendors} />
      )}
    </div>
  );
}
