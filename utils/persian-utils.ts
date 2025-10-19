// utils/persian-utils.ts

// A simple utility to convert English digits to Persian digits.
export const toPersianDigits = (n: string | number): string => {
  if (n === undefined || n === null) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n).replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
};
