import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

const createStorage = (): Storage => {
    const store = new Map<string, string>();

    return {
        get length() {
            return store.size;
        },
        clear: () => {
            store.clear();
        },
        getItem: (key: string) => store.get(key) ?? null,
        key: (index: number) => Array.from(store.keys())[index] ?? null,
        removeItem: (key: string) => {
            store.delete(key);
        },
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
    };
};

const localStorageMock = createStorage();

Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: localStorageMock,
});

Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorageMock,
});

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
    localStorageMock.clear();
    cleanup();
});
