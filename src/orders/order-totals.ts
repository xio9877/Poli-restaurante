export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateOrderTotals(subtotal: number, taxRate: number, discount = 0) {
  const roundedSubtotal = roundCurrency(subtotal);
  const taxAmount = roundCurrency(roundedSubtotal * taxRate);

  return {
    subtotal: roundedSubtotal,
    taxAmount,
    total: roundCurrency(roundedSubtotal + taxAmount - discount),
  };
}
