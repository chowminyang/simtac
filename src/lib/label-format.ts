const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "into",
  "nor",
  "of",
  "on",
  "or",
  "over",
  "per",
  "the",
  "to",
  "up",
  "via",
  "with",
]);

function splitLabelKey(key: string): string[] {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function titleCaseWord(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function formatFieldLabel(key: string): string {
  const words = splitLabelKey(key);
  if (!words.length) return key;

  return words
    .map((word, index) => {
      if (/^\d+$/.test(word)) return word;
      if (word === word.toUpperCase() && /[A-Z]/.test(word)) return word;

      const lower = word.toLowerCase();
      const isSmallWord = SMALL_WORDS.has(lower);
      const isEdgeWord = index === 0 || index === words.length - 1;
      if (isSmallWord && !isEdgeWord) return lower;

      return titleCaseWord(word);
    })
    .join(" ");
}
