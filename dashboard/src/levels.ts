export interface Level {
  name: string;
  min: number;
  color: string;
}

export function levelFor(points: number, levels: Level[]): Level | null {
  if (!Array.isArray(levels) || levels.length === 0) return null;
  const sorted = [...levels].sort((a, b) => a.min - b.min);
  let cur = sorted[0];
  for (const l of sorted) if (points >= l.min) cur = l;
  return cur;
}
