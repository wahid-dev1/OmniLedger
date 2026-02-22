import { useState, useEffect } from "react";
import { formatCurrency, formatCurrencyCompact } from "@/lib/currency";
import { DEFAULT_CURRENCY } from "@shared/constants";

/**
 * Hook to get company currency and formatting functions
 */
export function useCompanyCurrency(companyId?: string) {
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);

  useEffect(() => {
    if (companyId) {
      loadCompanyCurrency();
    }

    async function loadCompanyCurrency() {
      try {
        const result = await (window as any).electronAPI?.getCompany(companyId!);
        if (result?.success && result.data?.currency) {
          setCurrency(result.data.currency);
        }
      } catch (error) {
        console.error("Error loading company currency:", error);
        setCurrency(DEFAULT_CURRENCY);
      }
    }
  }, [companyId]);

  return {
    currency,
    format: (amount: number | string, options?: { decimals?: number }) =>
      formatCurrency(amount, currency, options),
    formatCompact: (amount: number | string) =>
      formatCurrencyCompact(amount, currency),
  };
}

