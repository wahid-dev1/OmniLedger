/**
 * Currency utility functions
 * Handles currency formatting and symbol conversion
 */

// Common currency symbols
const CURRENCY_SYMBOLS: Record<string, string> = {
  PKR: "Rs",
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  AED: "د.إ",
  SAR: "﷼",
  AUD: "A$",
  CAD: "C$",
  JPY: "¥",
  CNY: "¥",
};

/**
 * Get currency symbol from currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode;
}

/**
 * Format amount with currency
 */
export function formatCurrency(
  amount: number | string,
  currencyCode: string = "PKR",
  options?: {
    showSymbol?: boolean;
    showCode?: boolean;
    decimals?: number;
  }
): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  const decimals = options?.decimals ?? 2;
  const formattedAmount = numAmount.toFixed(decimals);

  if (options?.showCode) {
    return `${formattedAmount} ${currencyCode}`;
  }

  const symbol = getCurrencySymbol(currencyCode);
  if (options?.showSymbol !== false) {
    return `${symbol} ${formattedAmount}`;
  }

  return formattedAmount;
}

/**
 * Format currency for display (compact format)
 */
export function formatCurrencyCompact(
  amount: number | string,
  currencyCode: string = "PKR"
): string {
  return formatCurrency(amount, currencyCode, { showSymbol: true });
}

