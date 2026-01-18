const SESSION_KEY_PREFIX = 'totp-passphrase-';

export function cachePassphrase(id: number, passphrase: string): void {
  try {
    sessionStorage.setItem(`${SESSION_KEY_PREFIX}${String(id)}`, passphrase);
  } catch {
    // sessionStorage might be unavailable in private browsing
  }
}

export function getCachedPassphrase(id: number): string | undefined {
  try {
    const value = sessionStorage.getItem(`${SESSION_KEY_PREFIX}${String(id)}`);
    return value ?? undefined;
  } catch {
    return undefined;
  }
}

export function forgetPassphrase(id: number): void {
  try {
    sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${String(id)}`);
  } catch {
    // sessionStorage might be unavailable in private browsing
  }
}

export function forgetAllPassphrases(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(SESSION_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => {
      sessionStorage.removeItem(key);
    });
  } catch {
    // sessionStorage might be unavailable in private browsing
  }
}
