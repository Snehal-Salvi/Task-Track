const GAP = 1024;

/**
 * Finds a position between two neighbours, so a move updates one row
 * instead of renumbering the whole column.
 *   positionBetween(1024, 2048) // 1536
 */
export function positionBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return 0;
  if (before === null) return after! - GAP;
  if (after === null) return before + GAP;
  return (before + after) / 2;
}
