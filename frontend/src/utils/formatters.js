/**
 * Utilidades compartidas de formateo monetario en Soles Peruanos (S/).
 */

export const formatMoney = (val) => {
  if (!val && val !== 0) return 'S/ 0.00';
  return `S/ ${Number(val).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatCompactMoney = (val) => {
  if (!val && val !== 0) return 'S/ 0.00';
  const num = Number(val);
  if (num >= 1_000_000_000) {
    return `S/ ${(num / 1_000_000_000).toFixed(2)} Mil Millones`;
  }
  if (num >= 1_000_000) {
    return `S/ ${(num / 1_000_000).toFixed(2)} Millones`;
  }
  return `S/ ${num.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`;
};
