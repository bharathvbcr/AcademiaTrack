import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  it('flushes setter updates synchronously', () => {
    const { result } = renderHook(() => useLocalStorage('sync-key', 'initial'));

    act(() => {
      result.current[1]('updated');
    });

    expect(window.localStorage.getItem('sync-key')).toBe(JSON.stringify('updated'));
  });
});
