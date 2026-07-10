import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildInvoiceWorkbook } from "@/lib/excel/buildInvoiceWorkbook";
import type { InvoiceDocumentData } from "@/services/documentService";

function fakeData(
  overrides: Partial<InvoiceDocumentData> = {},
): InvoiceDocumentData {
  return {
    invoiceNumber: "TQ-01",
    status: "SENT",
    issueDate: new Date("2026-01-01"),
    dueDate: new Date("2026-01-15"),
    projectName: "Acme Ongoing Support",
    contractor: {
      name: "Acme Robotics",
      email: "billing@acme.example",
      street1: "1 Main St",
      street2: null,
      city: "Springfield",
      state: "IL",
      postalCode: "62701",
      country: "USA",
    },
    client: {
      name: "Client Co",
      email: null,
      street1: null,
      street2: null,
      city: null,
      state: null,
      postalCode: null,
      country: null,
    },
    paymentDetails: [
      { key: "bank_name", label: "Bank Name", value: "Test Bank" },
      { key: "routing_number", label: "Routing Number (ABA)", value: "021000021" },
    ],
    items: [
      {
        id: "item_1",
        description: "Consulting",
        quantity: "2",
        unitPrice: "150",
        amount: "300",
      },
    ],
    subtotal: "300",
    total: "300",
    convertedTotal: null,
    convertedCurrency: null,
    ...overrides,
  };
}

async function loadWorkbook(buffer: ExcelJS.Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

describe("buildInvoiceWorkbook", () => {
  it("produces a non-empty buffer for a DRAFT-shaped invoice without throwing", async () => {
    const buffer = await buildInvoiceWorkbook(fakeData({ status: "DRAFT" }));
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("produces a non-empty buffer for a SENT invoice with a converted total without throwing", async () => {
    const buffer = await buildInvoiceWorkbook(
      fakeData({ convertedTotal: "450", convertedCurrency: "AUD" }),
    );
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("writes a single 'Invoice' worksheet with the contractor name, invoice number, and no hardcoded bare $", async () => {
    const buffer = await buildInvoiceWorkbook(fakeData());
    const workbook = await loadWorkbook(buffer);
    const ws = workbook.getWorksheet("Invoice");
    expect(ws).toBeDefined();

    const allValues: string[] = [];
    ws!.eachRow((row) => {
      row.eachCell((cell) => {
        if (typeof cell.value === "string") allValues.push(cell.value);
      });
    });

    expect(allValues.some((v) => v.includes("Acme Robotics"))).toBe(true);
    expect(allValues.some((v) => v.includes("TQ-01"))).toBe(true);
    expect(allValues.some((v) => v.includes("Payment to be made to:"))).toBe(
      true,
    );
    expect(allValues.some((v) => v.includes("Routing Number (ABA)"))).toBe(
      true,
    );
    // Currency indicator present, but never a bare/ambiguous standalone "$".
    expect(allValues.some((v) => /\$\d/.test(v))).toBe(true);
    expect(allValues.some((v) => v.trim() === "$")).toBe(false);
  });

  it("renders the converted-total row with an explicit currency label, not a bare symbol", async () => {
    const buffer = await buildInvoiceWorkbook(
      fakeData({ convertedTotal: "450", convertedCurrency: "AUD" }),
    );
    const workbook = await loadWorkbook(buffer);
    const ws = workbook.getWorksheet("Invoice")!;

    const allValues: string[] = [];
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        if (typeof cell.value === "string") allValues.push(cell.value);
      });
    });

    expect(allValues.some((v) => v.includes("Total in AUD"))).toBe(true);
    expect(allValues.some((v) => /A\$450/.test(v))).toBe(true);
  });
});
