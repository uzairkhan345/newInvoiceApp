import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { PartyForm } from "@/components/party/PartyForm";
import { PartyDetailCard } from "@/components/party/PartyDetailCard";
import { PartyDeleteButton } from "@/components/party/PartyDeleteButton";
import {
  PartyDetailTabs,
  type PartyDetailTab,
} from "@/components/party/PartyDetailTabs";
import { PaymentMethodList } from "@/components/payment-method/PaymentMethodList";
import { InvoiceTable } from "@/components/invoice/InvoiceTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { partyService } from "@/services/partyService";
import { paymentMethodService } from "@/services/paymentMethodService";
import { projectService } from "@/services/projectService";
import { invoiceService } from "@/services/invoiceService";
import { toInvoiceTableRow } from "@/lib/invoiceTableRow";
import { getAiAssistConfigSummary } from "@/lib/ai-providers/config";
import type { PaymentMethod, Party } from "@/generated/prisma/client";

function resolveTab(value: string | undefined): PartyDetailTab {
  if (value === "payment-methods" || value === "invoices") return value;
  return "overview";
}

export default async function PartyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; edit?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam, edit } = await searchParams;
  const tab = resolveTab(tabParam);
  const isEditingOverview = tab === "overview" && edit === "1";

  const party = await partyService.getById(id);
  if (!party) {
    notFound();
  }

  if (isEditingOverview) {
    const aiConfig = await getAiAssistConfigSummary();
    return (
      <>
        <PageHeader
          title={party.name}
          subtitle="Edit party details and address."
          backHref="/parties"
          backLabel="Back to Parties"
          action={
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/parties/${party.id}`} />}
            >
              Cancel
            </Button>
          }
        />
        <PartyForm
          mode="edit"
          partyId={party.id}
          aiConfig={aiConfig}
          defaultValues={{
            name: party.name,
            email: party.email ?? "",
            type: party.type,
            street1: party.street1 ?? "",
            street2: party.street2 ?? "",
            city: party.city ?? "",
            state: party.state ?? "",
            postalCode: party.postalCode ?? "",
            country: party.country ?? "",
          }}
        />
      </>
    );
  }

  const [isDeletable, paymentMethods, invoices] = await Promise.all([
    partyService.isDeletable(id),
    paymentMethodService.listForParty(id),
    invoiceService.listByParty(id),
  ]);

  return (
    <>
      <PageHeader
        title={party.name}
        subtitle="View party details and address."
        backHref="/parties"
        backLabel="Back to Parties"
        action={
          <PartyDeleteButton
            partyId={party.id}
            partyName={party.name}
            isDeletable={isDeletable}
          />
        }
      />
      <PartyDetailTabs
        partyId={party.id}
        active={tab}
        paymentMethodsCount={paymentMethods.length}
        invoicesCount={invoices.length}
      />

      {tab === "overview" ? (
        <PartyDetailCard
          party={party}
          editHref={`/parties/${party.id}?tab=overview&edit=1`}
        />
      ) : tab === "payment-methods" ? (
        <PaymentMethodsTab party={party} paymentMethods={paymentMethods} />
      ) : (
        <InvoicesTab party={party} invoices={invoices} />
      )}
    </>
  );
}

async function PaymentMethodsTab({
  party,
  paymentMethods,
}: {
  party: Party;
  paymentMethods: PaymentMethod[];
}) {
  const [deletableFlags, projectRefsByPaymentMethodId] = await Promise.all([
    Promise.all(
      paymentMethods.map((method) => paymentMethodService.isDeletable(method.id)),
    ),
    projectService.listProjectRefsByPreferredPaymentMethod(
      paymentMethods.map((method) => method.id),
    ),
  ]);
  const deletableIds = new Set(
    paymentMethods
      .filter((_, index) => deletableFlags[index])
      .map((method) => method.id),
  );

  return (
    <>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-foreground">
          Payment Methods
        </h2>
        {paymentMethods.length > 0 ? (
          <Button
            variant="outline"
            className="h-8 px-3 text-[12px]"
            nativeButton={false}
            render={<Link href={`/parties/${party.id}/payment-methods/new`} />}
          >
            Add Payment Method
          </Button>
        ) : null}
      </div>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Only needed if this party is ever used as a project&rsquo;s contractor —
        a party used only as a client doesn&rsquo;t need one.
      </p>
      <PaymentMethodList
        partyId={party.id}
        paymentMethods={paymentMethods}
        deletableIds={deletableIds}
        projectRefsByPaymentMethodId={projectRefsByPaymentMethodId}
      />
    </>
  );
}

function InvoicesTab({
  party,
  invoices,
}: {
  party: Party;
  invoices: Awaited<ReturnType<typeof invoiceService.listByParty>>;
}) {
  return (
    <>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-foreground">Invoices</h2>
      </div>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Every invoice where {party.name} is the client or the contractor.
      </p>
      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Invoices will appear here once this party is used as a project's client or contractor."
        />
      ) : (
        <InvoiceTable invoices={invoices.map(toInvoiceTableRow)} />
      )}
    </>
  );
}
