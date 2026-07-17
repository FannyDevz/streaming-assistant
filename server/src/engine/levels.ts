// Hitung level/badge dari total point.
export interface Level {
  name: string;
  min: number;
  color: string;
}

export function levelFor(points: number, levels: Level[]): Level | null {
  if (!Array.isArray(levels) || levels.length === 0) return null;
  const sorted = [...levels].sort((a, b) => a.min - b.min);
  let current: Level | null = null;
  for (const lv of sorted) {
    if (points >= lv.min) current = lv;
  }
  return current ?? sorted[0];
}
