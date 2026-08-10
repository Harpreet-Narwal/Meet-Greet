/**
 * Token storage, web implementation.
 *
 * The browser has no keychain, and `expo-secure-store` ships no web build — so
 * Expo Web falls back to localStorage here.
 *
 * This is deliberately NOT how Mulaqat serves real browsers: that is the
 * Next.js app, which keeps tokens in httpOnly cookies behind the BFF precisely
 * so no script can read them. Expo Web exists here for previewing the native
 * screens on a desktop, so localStorage is an acceptable dev-surface trade —
 * but do not promote this target to production without moving to the same
 * cookie-backed session the web app uses.
 */
export async function getItem(key: string): Promise<string | null> {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    // Safari in private mode throws on access rather than returning null.
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Nothing to do — the session simply will not survive a reload.
  }
}

export async function deleteItem(key: string): Promise<void> {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // Already unreachable; treat as removed.
  }
}
