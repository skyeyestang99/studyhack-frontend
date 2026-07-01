export interface SearchableEntity {
  name: string;
  shortName?: string | null;
  aliases?: string[];
}

export interface RankedMatch<T> {
  item: T;
  score: number;
  strong: boolean;
}

export const STRONG_MATCH_THRESHOLD = 0.72;

const STOP_WORDS = new Set([
  "and",
  "at",
  "for",
  "in",
  "of",
  "the",
]);

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compact(value: string): string {
  return normalize(value).replace(/\s+/g, "");
}

/**
 * Keeps short initialisms intact ("UC San Diego" -> "ucsd") while reducing
 * ordinary words to initials ("University of California..." -> "ucsd").
 */
export function acronym(value: string): string {
  return normalize(value)
    .split(" ")
    .filter((word) => word && !STOP_WORDS.has(word))
    .map((word) => (word.length <= 2 ? word : word[0]))
    .join("");
}

function bigrams(value: string): Set<string> {
  const result = new Set<string>();
  if (value.length < 2) {
    if (value) result.add(value);
    return result;
  }
  for (let index = 0; index < value.length - 1; index += 1) {
    result.add(value.slice(index, index + 2));
  }
  return result;
}

function diceSimilarity(left: string, right: string): number {
  const leftBigrams = bigrams(left);
  const rightBigrams = bigrams(right);
  if (!leftBigrams.size || !rightBigrams.size) return 0;
  let overlap = 0;
  leftBigrams.forEach((gram) => {
    if (rightBigrams.has(gram)) overlap += 1;
  });
  return (2 * overlap) / (leftBigrams.size + rightBigrams.size);
}

function scoreValue(query: string, value: string): number {
  const normalizedValue = normalize(value);
  const compactQuery = compact(query);
  const compactValue = compact(value);
  const valueAcronym = acronym(value);

  if (!normalizedValue || !compactQuery) return 0;
  if (query === normalizedValue || compactQuery === compactValue) return 1;
  if (compactQuery === valueAcronym) return 0.99;
  if (normalizedValue.startsWith(query) || compactValue.startsWith(compactQuery)) {
    return 0.94;
  }
  if (valueAcronym.startsWith(compactQuery)) return 0.92;

  const queryWords = query.split(" ");
  const valueWords = normalizedValue.split(" ");
  if (
    queryWords.every((queryWord) =>
      valueWords.some((valueWord) => valueWord.startsWith(queryWord)),
    )
  ) {
    return 0.9;
  }
  if (normalizedValue.includes(query) || compactValue.includes(compactQuery)) {
    return 0.84;
  }

  return diceSimilarity(compactQuery, compactValue) * 0.82;
}

export function rankMatches<T extends SearchableEntity>(
  items: T[],
  rawQuery: string,
  limit = 5,
): RankedMatch<T>[] {
  const query = normalize(rawQuery);
  if (!query) {
    return items.slice(0, limit).map((item) => ({
      item,
      score: 1,
      strong: true,
    }));
  }

  return items
    .map((item) => {
      const values = [item.name, item.shortName, ...(item.aliases ?? [])].filter(
        (value): value is string => Boolean(value),
      );
      const score = Math.max(...values.map((value) => scoreValue(query, value)));
      return {
        item,
        score,
        strong: score >= STRONG_MATCH_THRESHOLD,
      };
    })
    .filter((match) => match.score > 0.12)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.item.name.localeCompare(right.item.name),
    )
    .slice(0, limit);
}
