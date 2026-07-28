import Link from "next/link";
import { Pencil } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DetailField } from "@/components/shared/DetailField";
import { addressLines } from "@/lib/partyAddress";
import type { Party } from "@/generated/prisma/client";

const TYPE_LABELS: Record<Party["type"], string> = {
  INDIVIDUAL: "Individual",
  ORGANIZATION: "Organization",
};

/**
 * Read-only view of a Party — the default landing state at /parties/[id],
 * per M10.5. Mirrors every field PartyForm edits.
 */
export function PartyDetailCard({
  party,
  editHref,
}: {
  party: Party;
  editHref: string;
}) {
  const lines = addressLines(party);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[15px] font-bold text-foreground">
          Details
        </CardTitle>
        <CardAction>
          <Button
            variant="outline"
            className="h-8 px-3 text-[12px]"
            nativeButton={false}
            render={<Link href={editHref} />}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DetailField label="Name" value={party.name} />
        <DetailField label="Type" value={TYPE_LABELS[party.type]} />
        <DetailField label="Email" value={party.email ?? "—"} />
        <DetailField
          label="Address"
          value={
            lines.length > 0 ? (
              <span className="flex flex-col">
                {lines.map((line, index) => (
                  <span key={index}>{line}</span>
                ))}
              </span>
            ) : (
              "—"
            )
          }
        />
      </CardContent>
    </Card>
  );
}
