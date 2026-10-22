export function highlightedMonthSlice<T>(
  items: readonly T[],
  start: number,
  count: number,
): { before: T[]; highlighted: T[]; after: T[] } {
  const safeStart = Math.max(0, Math.min(start, items.length));
  const end = Math.min(items.length, safeStart + Math.max(count, 0));

  return {
    before: items.slice(0, safeStart),
    highlighted: items.slice(safeStart, end),
    after: items.slice(end),
  };
}
