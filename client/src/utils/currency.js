export const getCurrencySymbol = (currencyCode = 'INR') => {
  const symbolMap = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'INR': '₹',
    'JPY': '¥',
    'AUD': 'A$'
  };
  return symbolMap[currencyCode] || '₹';
};

export const formatCurrency = (val, currencyCode = 'INR') => {
  const symbol = getCurrencySymbol(currencyCode);
  const numericVal = parseFloat(val);
  
  if (isNaN(numericVal)) return `${symbol}0.00`;
  
  // Format with standard locale settings (en-IN is useful if INR, otherwise undefined)
  const locale = currencyCode === 'INR' ? 'en-IN' : undefined;
  
  const formattedVal = numericVal.toLocaleString(locale, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  
  return `${symbol}${formattedVal}`;
};
