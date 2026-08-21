import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAI } from '../useAI';

describe('useAI', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('only stops the generation owned by the caller', async () => {
    let activeSignal: AbortSignal | null = null;
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      const signal = (init?.signal as AbortSignal | undefined) ?? null;
      if (signal) {
        activeSignal = signal;
      }
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAI());

    act(() => {
      result.current.updateSettings({
        enabled: true,
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'llama3.1',
      });
    });

    let chatPromise!: Promise<string>;
    act(() => {
      chatPromise = result.current.chat([{ role: 'user', content: 'hello' }], undefined, 'dashboard');
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(true));

    act(() => {
      result.current.stop('assistant');
    });

    expect((activeSignal as AbortSignal | null)?.aborted ?? false).toBe(false);
    expect(result.current.isGenerating).toBe(true);

    act(() => {
      result.current.stop('dashboard');
    });

    await expect(chatPromise).rejects.toMatchObject({ name: 'AbortError' });
    expect((activeSignal as AbortSignal | null)?.aborted ?? false).toBe(true);
    await waitFor(() => expect(result.current.isGenerating).toBe(false));
  });

  it('aborts stale connection tests when a newer one starts', async () => {
    let firstSignal: AbortSignal | null = null;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce((_url: string, init?: RequestInit) => {
        firstSignal = (init?.signal as AbortSignal | undefined) ?? null;
        return new Promise<Response>((_resolve, reject) => {
          firstSignal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ name: 'llama3.1' }] }),
      } as Response);

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAI());

    let firstPromise!: Promise<string[]>;
    let secondPromise!: Promise<string[]>;
    act(() => {
      firstPromise = result.current.testConnection();
      secondPromise = result.current.testConnection();
    });

    await act(async () => {
      await expect(secondPromise).resolves.toEqual(['llama3.1']);
      await expect(firstPromise).resolves.toEqual([]);
    });

    expect((firstSignal as AbortSignal | null)?.aborted ?? false).toBe(true);
    await waitFor(() =>
      expect(result.current.connection).toEqual({ status: 'ok', models: ['llama3.1'] }),
    );
  });
});
