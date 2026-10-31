/** German cardinal words for small counts (matches former num-words-de usage in the app). */

const UNITS = [
  "null",
  "ein",
  "zwei",
  "drei",
  "vier",
  "fünf",
  "sechs",
  "sieben",
  "acht",
  "neun",
] as const;

const TEENS = [
  "zehn",
  "elf",
  "zwölf",
  "dreizehn",
  "vierzehn",
  "fünfzehn",
  "sechzehn",
  "siebzehn",
  "achtzehn",
  "neunzehn",
] as const;

const TENS = [
  "",
  "",
  "zwanzig",
  "dreißig",
  "vierzig",
  "fünfzig",
  "sechzig",
  "siebzig",
  "achtzig",
  "neunzig",
] as const;

export type NumToWordDeOptions = {
  uppercase?: boolean;
  /** For 1: "eine" instead of "eins" (indefinite article form). */
  indefinite_eine?: boolean;
};

function wordForInteger(n: number, indefiniteEine: boolean): string {
  if (n === 0) {
    return UNITS[0];
  }
  if (n === 1) {
    return indefiniteEine ? "eine" : "eins";
  }
  if (n < 10) {
    return UNITS[n];
  }
  if (n < 20) {
    return TEENS[n - 10];
  }
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    if (ones === 0) {
      return TENS[tens];
    }
    if (ones === 1) {
      return `einund${TENS[tens]}`;
    }
    return `${UNITS[ones]}und${TENS[tens]}`;
  }
  return String(n);
}

/**
 * Converts a non-negative integer to a German word (lowercase by default).
 * Supports 0–99; larger values fall back to decimal digits.
 */
export function numToWordDe(number: number, options: NumToWordDeOptions = {}): string {
  const { uppercase = true, indefinite_eine = false } = options;
  const int = Math.trunc(number);
  if (!Number.isFinite(int) || int < 0) {
    return String(number);
  }

  let word = wordForInteger(int, indefinite_eine);
  if (uppercase === false) {
    return word;
  }
  return word.charAt(0).toUpperCase() + word.slice(1);
}
