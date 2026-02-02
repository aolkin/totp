import { describe, it, expect } from 'vitest';
import { scoreWord, comfortLevel } from '../typing-comfort';

describe('typing-comfort', () => {
  describe('scoreWord', () => {
    it('should return a score between 0 and 100', () => {
      const score = scoreWord('hello');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should score alternating-hand words higher', () => {
      // "dish" alternates hands: d(L) i(R) s(L) h(R)
      const alternating = scoreWord('dish');
      // "were" is all left hand: w(L) e(L) r(L) e(L)
      const sameHand = scoreWord('were');
      expect(alternating).toBeGreaterThan(sameHand);
    });

    it('should penalize same-finger consecutive keys', () => {
      // "de" uses same finger (left middle): d->e
      const sameFinger = scoreWord('de');
      // "sk" alternates hands: s(L) k(R)
      const diffHand = scoreWord('sk');
      expect(diffHand).toBeGreaterThan(sameFinger);
    });

    it('should handle single-character words', () => {
      expect(scoreWord('a')).toBe(100);
    });

    it('should handle empty strings', () => {
      expect(scoreWord('')).toBe(100);
    });
  });

  describe('comfortLevel', () => {
    it('should return Excellent for scores >= 80', () => {
      expect(comfortLevel(80)).toBe('Excellent');
      expect(comfortLevel(100)).toBe('Excellent');
    });

    it('should return Good for scores 60-79', () => {
      expect(comfortLevel(60)).toBe('Good');
      expect(comfortLevel(79)).toBe('Good');
    });

    it('should return Fair for scores 40-59', () => {
      expect(comfortLevel(40)).toBe('Fair');
      expect(comfortLevel(59)).toBe('Fair');
    });

    it('should return Poor for scores < 40', () => {
      expect(comfortLevel(39)).toBe('Poor');
      expect(comfortLevel(0)).toBe('Poor');
    });
  });
});
