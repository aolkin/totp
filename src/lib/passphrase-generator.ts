import { EFF_WORDLIST } from './eff-wordlist';
import { scoreWord, comfortLevel, type ComfortLevel } from './typing-comfort';

export type Separator = '-' | ' ' | '.' | '';

export interface GenerateOptions {
  wordCount: number;
  separator: Separator;
  easyWordsOnly: boolean;
}

export interface GeneratedPassphrase {
  passphrase: string;
  words: string[];
  entropyBits: number;
  comfortScore: number;
  comfortLevel: ComfortLevel;
}

let cachedScores: Map<string, number> | undefined;
let cachedEasyWords: string[] | undefined;

function getScores(): Map<string, number> {
  if (!cachedScores) {
    cachedScores = new Map();
    for (const word of EFF_WORDLIST) {
      cachedScores.set(word, scoreWord(word));
    }
  }
  return cachedScores;
}

function getEasyWords(): string[] {
  if (!cachedEasyWords) {
    const scores = getScores();
    cachedEasyWords = EFF_WORDLIST.filter((w) => (scores.get(w) ?? 0) >= 60);
  }
  return cachedEasyWords;
}

export function getPoolSize(easyOnly: boolean): number {
  return easyOnly ? getEasyWords().length : EFF_WORDLIST.length;
}

function secureRandomIndex(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let val: number;
  do {
    crypto.getRandomValues(buf);
    val = buf[0];
  } while (val >= limit);
  return val % max;
}

function pickWords(pool: string[], count: number): string[] {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(pool[secureRandomIndex(pool.length)]);
  }
  return words;
}

function averageComfort(words: string[]): number {
  const scores = getScores();
  const total = words.reduce((sum, w) => sum + (scores.get(w) ?? 0), 0);
  return Math.round(total / words.length);
}

export function generate(options: GenerateOptions): GeneratedPassphrase {
  const pool = options.easyWordsOnly ? getEasyWords() : EFF_WORDLIST;
  const words = pickWords(pool, options.wordCount);
  const entropy = Math.floor(Math.log2(pool.length) * options.wordCount);
  const score = averageComfort(words);

  return {
    passphrase: words.join(options.separator),
    words,
    entropyBits: entropy,
    comfortScore: score,
    comfortLevel: comfortLevel(score),
  };
}

export function regenerateWord(
  words: string[],
  index: number,
  easyOnly: boolean,
  separator: Separator,
): GeneratedPassphrase {
  const pool = easyOnly ? getEasyWords() : EFF_WORDLIST;
  const newWords = [...words];
  newWords[index] = pool[secureRandomIndex(pool.length)];
  const entropy = Math.floor(Math.log2(pool.length) * newWords.length);
  const score = averageComfort(newWords);

  return {
    passphrase: newWords.join(separator),
    words: newWords,
    entropyBits: entropy,
    comfortScore: score,
    comfortLevel: comfortLevel(score),
  };
}
