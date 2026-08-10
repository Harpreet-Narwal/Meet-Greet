import * as SecureStore from "expo-secure-store";

/**
 * Token storage, native implementation — the OS keychain / Keystore.
 *
 * Metro picks `secure-store.web.ts` over this file for the web target, because
 * expo-secure-store has no web build at all (calling into it there throws
 * "getValueWithKeyAsync is not a function"). Splitting by filename rather than
 * branching on `Platform.OS` keeps the native bundle free of any browser
 * fallback, which is the whole point of using the keychain.
 */
export async function getItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
