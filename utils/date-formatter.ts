// utils/date-formatter.ts

// Make TypeScript aware of the global jalaali object from the CDN
declare const jalaali: any;

/**
 * Converts a Gregorian Date object to a Shamsi date string (YYYY-MM-DD).
 * @param date - The Gregorian Date object.
 * @returns A string in YYYY-MM-DD format representing the Shamsi date.
 */
export const formatToShamsi = (date: Date): string => {
  if (!jalaali) {
    console.error("jalaali-js library not loaded!");
    // Fallback to Gregorian
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const j = jalaali.toJalaali(date);
  return `${j.jy}-${String(j.jm).padStart(2, '0')}-${String(j.jd).padStart(2, '0')}`;
};

/**
 * Parses a Shamsi date string (YYYY-MM-DD) and converts it to a Gregorian Date object.
 * @param shamsiStr - A string in YYYY-MM-DD format representing a Shamsi date.
 * @returns A Gregorian Date object, or null if parsing fails.
 */
export const parseShamsi = (shamsiStr: string): Date | null => {
    if (!jalaali) {
        console.error("jalaali-js library not loaded!");
        return new Date(shamsiStr); // Will likely be invalid, but it's a fallback
    }
    try {
        const parts = shamsiStr.split('-').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) {
            return null;
        }
        const [jy, jm, jd] = parts;
        if (!jalaali.isValidJalaaliDate(jy, jm, jd)) {
            return null;
        }
        const g = jalaali.toGregorian(jy, jm, jd);
        return new Date(g.gy, g.gm - 1, g.gd);
    } catch (e) {
        console.error("Error parsing Shamsi date string:", shamsiStr, e);
        return null;
    }
};

/**
 * Gets today's date as a Shamsi date string (YYYY-MM-DD).
 * @returns A string in YYYY-MM-DD format.
 */
export const getTodayShamsi = (): string => {
  return formatToShamsi(new Date());
};
