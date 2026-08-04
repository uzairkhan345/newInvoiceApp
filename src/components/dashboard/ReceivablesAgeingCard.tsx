import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import type { buildReceivablesAgeing } from "@/lib/projectBillingStatus";

type Ageing = ReturnType<typeof buildReceivablesAgeing>;

/** Receivables ageing bar + bucket list — USD-only (see buildReceivablesAgeing's doc comment for why). */
export function ReceivablesAgeingCard({ ageing }: { ageing: Ageing }) {
  const total =
    Number(ageing.notYetDue.total) +
    Number(ageing.dueSoon.total) +
    Number(ageing.late.total);
  const pct = (value: string) =>
    total > 0 ? (Number(value) / total) * 100 : 0;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="border-b border-border px-5 py-[14px]">
        <span className="text-[14px] font-normal tracking-[-0.14px] text-foreground">
          Receivables ageing
        </span>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {formatCurrency(total, "USD")} total outstanding
        </p>
      </div>
      <div className="px-5 pt-4">
        <div className="flex h-2 overflow-hidden rounded-full bg-muted">
          <span
            className="bg-brand"
            style={{ width: `${pct(ageing.notYetDue.total)}%` }}
          />
          <span
            className="bg-amber-400"
            style={{ width: `${pct(ageing.dueSoon.total)}%` }}
          />
          <span
            className="bg-[var(--status-overdue-text)]"
            style={{ width: `${pct(ageing.late.total)}%` }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2.5 px-5 pt-3.5 pb-4">
        <AgeingRow
          dotClass="bg-brand"
          label={ageing.notYetDue.label}
          total={ageing.notYetDue.total}
        />
        <AgeingRow
          dotClass="bg-amber-400"
          label={ageing.dueSoon.label}
          total={ageing.dueSoon.total}
        />
        <AgeingRow
          dotClass="bg-[var(--status-overdue-text)]"
          label={ageing.late.label}
          total={ageing.late.total}
        />
      </div>
    </Card>
  );
}

function AgeingRow({
  dotClass,
  label,
  total,
}: {
  dotClass: string;
  label: string;
  total: string;
}) {
  return (
    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
      <span className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        {label}
      </span>
      <span className="font-mono font-semibold text-foreground">
        {formatCurrency(total, "USD")}
      </span>
    </div>
  );
}
