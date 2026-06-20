const hasStorageShape = (storage: Storage | null | undefined): storage is Storage =>
  !!storage &&
  typeof storage.getItem === 'function' &&
  typeof storage.setItem === 'function' &&
  typeof storage.removeItem === 'function';

export const getLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return hasStorageShape(window.localStorage) ? window.localStorage : null;
};

export const getStorageItem = (key: string): string | null => {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

export const setStorageItem = (key: string, value: string): boolean => {
  const storage = getLocalStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') throw e;
    return false;
  }
};

export const removeStorageItem = (key: string): boolean => {
  const storage = getLocalStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

export const readJsonFromStorage = <T>(key: string): T | null => {
  const item = getStorageItem(key);
  if (item === null) {
    return null;
  }

  try {
    return JSON.parse(item) as T;
  } catch {
    // Corrupted JSON: preserve a recoverable copy before clearing the original so
    // the user's data is not silently and permanently lost, then warn.
    try {
      setStorageItem(`${key}__corrupt`, item);
    } catch {
      // Best-effort: if the copy cannot be written (e.g. quota), don't block load.
    }
    console.warn(
      `Corrupted JSON at storage key "${key}"; preserved a recovery copy at "${key}__corrupt" and cleared the original.`
    );
    removeStorageItem(key);
    return null;
  }
};

export const writeJsonToStorage = (key: string, value: unknown): boolean =>
  setStorageItem(key, JSON.stringify(value));
