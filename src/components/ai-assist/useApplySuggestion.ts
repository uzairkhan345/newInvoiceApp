"use client";

import { useRef, useState } from "react";

/**
 * Shared by PartyForm/PaymentMethodForm/InvoiceForm — tracks which field
 * keys an AI Assist suggestion just touched so FormField can render the
 * brief brand-light flash (Docs/ui_design_guide.md §14), then clears it.
 */
export function useApplySuggestion() {
  const [highlightedKeys, setHighlightedKeys] = useState<Set<string>>(
    new Set(),
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function applySuggestion(
    suggestion: Record<string, unknown>,
    apply: (suggestion: Record<string, unknown>) => void,
  ) {
    apply(suggestion);
    setHighlightedKeys(new Set(Object.keys(suggestion)));
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setHighlightedKeys(new Set()), 1500);
  }

  return { highlightedKeys, applySuggestion };
}
