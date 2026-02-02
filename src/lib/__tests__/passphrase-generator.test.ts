import { describe, it, expect } from 'vitest';
import { generate, regenerateWord, getPoolSize } from '../passphrase-generator';

describe('passphrase-generator', () => {
  describe('generate', () => {
    it('should generate a passphrase with the specified word count', () => {
      const result = generate({ wordCount: 6, separator: '-', easyWordsOnly: false });
      expect(result.words).toHaveLength(6);
      expect(result.passphrase.split('-')).toHaveLength(6);
    });

    it('should use the specified separator', () => {
      const dot = generate({ wordCount: 3, separator: '.', easyWordsOnly: false });
      expect(dot.passphrase.split('.')).toHaveLength(3);

      const space = generate({ wordCount: 3, separator: ' ', easyWordsOnly: false });
      expect(space.passphrase.split(' ')).toHaveLength(3);

      const none = generate({ wordCount: 3, separator: '', easyWordsOnly: false });
      expect(none.passphrase).toBe(none.words.join(''));
    });

    it('should calculate entropy bits', () => {
      const result = generate({ wordCount: 6, separator: '-', easyWordsOnly: false });
      // 7776 words = ~12.9 bits/word, 6 words = ~77 bits
      expect(result.entropyBits).toBeGreaterThan(70);
      expect(result.entropyBits).toBeLessThan(85);
    });

    it('should include comfort score and level', () => {
      const result = generate({ wordCount: 6, separator: '-', easyWordsOnly: false });
      expect(result.comfortScore).toBeGreaterThanOrEqual(0);
      expect(result.comfortScore).toBeLessThanOrEqual(100);
      expect(['Excellent', 'Good', 'Fair', 'Poor']).toContain(result.comfortLevel);
    });

    it('should produce different passphrases on each call', () => {
      const a = generate({ wordCount: 6, separator: '-', easyWordsOnly: false });
      const b = generate({ wordCount: 6, separator: '-', easyWordsOnly: false });
      expect(a.passphrase).not.toBe(b.passphrase);
    });

    it('should filter to easy words when easyWordsOnly is true', () => {
      const result = generate({ wordCount: 4, separator: '-', easyWordsOnly: true });
      expect(result.words).toHaveLength(4);
      expect(result.comfortScore).toBeGreaterThanOrEqual(60);
    });
  });

  describe('regenerateWord', () => {
    it('should replace only the specified word', () => {
      const original = generate({ wordCount: 4, separator: '-', easyWordsOnly: false });
      const updated = regenerateWord(original.words, 2, false, '-');

      expect(updated.words[0]).toBe(original.words[0]);
      expect(updated.words[1]).toBe(original.words[1]);
      expect(updated.words[3]).toBe(original.words[3]);
      expect(updated.words).toHaveLength(4);
    });
  });

  describe('getPoolSize', () => {
    it('should return 7776 for the full pool', () => {
      expect(getPoolSize(false)).toBe(7776);
    });

    it('should return a smaller number for easy-only pool', () => {
      const easySize = getPoolSize(true);
      expect(easySize).toBeGreaterThan(1000);
      expect(easySize).toBeLessThan(7776);
    });
  });
});
