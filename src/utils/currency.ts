/**
 * Currency formatting utility for Indian Rupees (INR)
 */

/**
 * Formats a number as Indian Rupees
 * @param amount - The amount to format
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "₹1,23,456")
 */
export const formatCurrency = (
  amount: number | null | undefined,
  options: {
    showDecimals?: boolean;
    compact?: boolean; // Show as K, L, Cr for large numbers
  } = {}
): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "₹0";
  }

  const { showDecimals = false, compact = false } = options;

  // Compact notation for large numbers
  if (compact) {
    if (amount >= 10000000) {
      // Crores
      return `₹${(amount / 10000000).toFixed(showDecimals ? 1 : 0)}Cr`;
    } else if (amount >= 100000) {
      // Lakhs
      return `₹${(amount / 100000).toFixed(showDecimals ? 1 : 0)}L`;
    } else if (amount >= 1000) {
      // Thousands
      return `₹${(amount / 1000).toFixed(showDecimals ? 1 : 0)}K`;
    }
  }

  // Standard Indian number formatting (lakhs and crores)
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
};

/**
 * Formats currency without symbol (just the number)
 * @param amount - The amount to format
 * @returns Formatted number string (e.g., "1,23,456")
 */
export const formatCurrencyNumber = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "0";
  }

  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Formats currency for display in tables/cards (compact format)
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "₹1.23L" or "₹12.34Cr")
 */
export const formatCurrencyCompact = (amount: number | null | undefined): string => {
  return formatCurrency(amount, { compact: true, showDecimals: true });
};
