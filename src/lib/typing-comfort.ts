export type Hand = 'left' | 'right';

export interface KeyInfo {
  row: number;
  col: number;
  finger: number;
  hand: Hand;
}

export type ComfortLevel = 'Excellent' | 'Good' | 'Fair' | 'Poor';

const KEYBOARD: Partial<Record<string, KeyInfo>> = {
  q: { row: 0, col: 0, finger: 0, hand: 'left' },
  w: { row: 0, col: 1, finger: 1, hand: 'left' },
  e: { row: 0, col: 2, finger: 2, hand: 'left' },
  r: { row: 0, col: 3, finger: 3, hand: 'left' },
  t: { row: 0, col: 4, finger: 3, hand: 'left' },
  y: { row: 0, col: 5, finger: 4, hand: 'right' },
  u: { row: 0, col: 6, finger: 4, hand: 'right' },
  i: { row: 0, col: 7, finger: 5, hand: 'right' },
  o: { row: 0, col: 8, finger: 6, hand: 'right' },
  p: { row: 0, col: 9, finger: 7, hand: 'right' },
  a: { row: 1, col: 0, finger: 0, hand: 'left' },
  s: { row: 1, col: 1, finger: 1, hand: 'left' },
  d: { row: 1, col: 2, finger: 2, hand: 'left' },
  f: { row: 1, col: 3, finger: 3, hand: 'left' },
  g: { row: 1, col: 4, finger: 3, hand: 'left' },
  h: { row: 1, col: 5, finger: 4, hand: 'right' },
  j: { row: 1, col: 6, finger: 4, hand: 'right' },
  k: { row: 1, col: 7, finger: 5, hand: 'right' },
  l: { row: 1, col: 8, finger: 6, hand: 'right' },
  z: { row: 2, col: 0, finger: 0, hand: 'left' },
  x: { row: 2, col: 1, finger: 1, hand: 'left' },
  c: { row: 2, col: 2, finger: 2, hand: 'left' },
  v: { row: 2, col: 3, finger: 3, hand: 'left' },
  b: { row: 2, col: 4, finger: 3, hand: 'left' },
  n: { row: 2, col: 5, finger: 4, hand: 'right' },
  m: { row: 2, col: 6, finger: 4, hand: 'right' },
};

function bigramPenalty(a: KeyInfo, b: KeyInfo): number {
  if (a.hand !== b.hand) return 0;

  if (a.finger === b.finger) {
    if (a.row === b.row && a.col === b.col) return 0.5;
    return 2.5;
  }

  const rowDiff = Math.abs(a.row - b.row);
  if (rowDiff === 0) return 0.2;
  if (rowDiff === 1) return 0.3;
  return 1.5;
}

function wordPenalty(word: string): number {
  const chars = word.toLowerCase().split('');
  const keys = chars.map((c) => KEYBOARD[c]).filter((k): k is KeyInfo => k !== undefined);

  if (keys.length < 2) return 0;

  let penalty = 0;

  for (let i = 1; i < keys.length; i++) {
    penalty += bigramPenalty(keys[i - 1], keys[i]);
  }

  let sameHandRun = 1;
  for (let i = 1; i < keys.length; i++) {
    if (keys[i].hand === keys[i - 1].hand) {
      sameHandRun++;
      if (sameHandRun > 2) penalty += 0.5;
    } else {
      sameHandRun = 1;
    }
  }

  if (keys.length >= 3) {
    const allSameHand = keys.every((k) => k.hand === keys[0].hand);
    if (allSameHand) penalty += 2.0;
  }

  return penalty;
}

export function scoreWord(word: string): number {
  const penalty = wordPenalty(word);
  const normalized = word.length > 0 ? penalty / word.length : 0;
  return Math.max(0, Math.round(100 - normalized * 50));
}

export function comfortScore(totalPenalty: number, length: number): number {
  const normalized = length > 0 ? totalPenalty / length : 0;
  return Math.max(0, Math.round(100 - normalized * 50));
}

export function comfortLevel(score: number): ComfortLevel {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}
