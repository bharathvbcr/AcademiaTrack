import { renderHook, act } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  const originalWindowStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');

  afterEach(() => {
    if (originalWindowStorage) {
      Object.defineProperty(window, 'localStorage', originalWindowStorage);
    }
  });

  it('flushes setter updates synchronously', () => {
    const { result } = renderHook(() => useLocalStorage('sync-key', 'initial'));

    act(() => {
      result.current[1]('updated');
    });

    expect(window.localStorage.getItem('sync-key')).toBe(JSON.stringify('updated'));
  });

  it('throws when a setting cannot be persisted', () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {},
    });

    const { result } = renderHook(() => useLocalStorage('sync-key', 'initial'));

    expect(() => {
      act(() => {
        result.current[1]('updated');
      });
    }).toThrow('Failed to write storage key "sync-key".');

    expect(result.current[0]).toBe('initial');
  });
});
