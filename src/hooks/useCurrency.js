import { useCallback } from 'react';
import { useLocalization } from '../context/LocalizationContext';

/**
 * Custom hook for currency formatting with reactivity
 * When user changes currency in settings, components using this hook will re-render
 */
export function useCurrency() {
  const { currency, formatCurrency, getCurrentCurrency } = useLocalization();

  // Memoized format function that uses the current currency from context
  const format = useCallback((amount, options = {}) => {
    return formatCurrency(amount, options.currency || null);
  }, [formatCurrency]);

  // Format with currency code displayed (e.g., "$150.00 CAD")
  const formatWithCode = useCallback((amount) => {
    const formatted = formatCurrency(amount);
    return `${formatted} ${currency}`;
  }, [formatCurrency, currency]);

  return {
    currency,
    currencyInfo: getCurrentCurrency(),
    format,
    formatWithCode,
  };
}

export default useCurrency;
