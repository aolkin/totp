/**
 * Build information utilities
 * Provides access to build-time metadata like commit hash
 */

/**
 * Returns the commit hash of the current build
 * @returns The commit hash, or 'dev' if running in development mode
 */
export function getCommitHash(): string {
  return __COMMIT_HASH__;
}

/**
 * Returns whether this is a production build (has a real commit hash)
 * @returns true if this is a production build with a commit hash
 */
export function isProductionBuild(): boolean {
  return __COMMIT_HASH__ !== 'dev';
}

/**
 * Returns a shortened version of the commit hash (first 7 characters)
 * @returns Shortened commit hash
 */
export function getShortCommitHash(): string {
  const hash = __COMMIT_HASH__;
  return hash.length > 7 ? hash.substring(0, 7) : hash;
}
