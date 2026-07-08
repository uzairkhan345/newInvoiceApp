import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { PartyForm } from "@/components/party/PartyForm";
import { PartyDeleteButton } from "@/components/party/PartyDeleteButton";
import { PaymentMethodList } from "@/components/payment-method/PaymentMethodList";
import { Button } from "@/components/ui/button";
import { partyService } from "@/services/partyService";
import { paymentMethodService } from "@/services/paymentMethodService";

export default async function PartyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const party = await partyService.getById(id);
  if (!party) {
    notFound();
  }

  const [isDeletable, paymentMethods] = await Promise.all([
    partyService.isDeletable(id),
    paymentMethodService.listForParty(id),
  ]);
  const deletableFlags = await Promise.all(
    paymentMethods.map((method) => paymentMethodService.isDeletable(method.id)),
  );
  const deletableIds = new Set(
    paymentMethods
      .filter((_, index) => deletableFlags[index])
      .map((method) => method.id),
  );

  return (
    <>
      <PageHeader
        title={party.name}
        subtitle="Edit party details and address."
        action={
          <PartyDeleteButton
            partyId={party.id}
            partyName={party.name}
            isDeletable={isDeletable}
          />
        }
      />
      <PartyForm
        mode="edit"
        partyId={party.id}
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

      <div className="mt-8 mb-3 flex items-center justify-between">
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
      <PaymentMethodList
        partyId={party.id}
        paymentMethods={paymentMethods}
        deletableIds={deletableIds}
      />
    </>
  );
}
