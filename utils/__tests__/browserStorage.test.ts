import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getLocalStorage,
  getStorageItem,
  readJsonFromStorage,
  removeStorageItem,
  setStorageItem,
  writeJsonToStorage,
} from '../browserStorage';

describe('browserStorage', () => {
  const originalWindowStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    if (originalWindowStorage) {
      Object.defineProperty(window, 'localStorage', originalWindowStorage);
    }
    window.localStorage.clear();
  });

  it('reads and writes JSON values when storage is available', () => {
    expect(writeJsonToStorage('settings', { theme: 'dark' })).toBe(true);
    expect(readJsonFromStorage<{ theme: string }>('settings')).toEqual({ theme: 'dark' });
  });

  it('removes malformed JSON entries instead of throwing', () => {
    window.localStorage.setItem('broken', '{');

    expect(readJsonFromStorage('broken')).toBeNull();
    expect(window.localStorage.getItem('broken')).toBeNull();
  });

  it('returns safe fallbacks when storage APIs are unavailable', () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {},
    });

    expect(getLocalStorage()).toBeNull();
    expect(getStorageItem('missing')).toBeNull();
    expect(setStorageItem('key', 'value')).toBe(false);
    expect(removeStorageItem('key')).toBe(false);
  });
});
