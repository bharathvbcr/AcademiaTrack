import React, { useState } from 'react';
import { readJsonFromStorage, writeJsonToStorage } from '../utils/browserStorage';

export function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    const item = readJsonFromStorage<T>(key);
    return item ?? initialValue;
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = React.useCallback((value) => {
    setStoredValue(prev => {
      const nextValue = value instanceof Function ? value(prev) : value;
      writeJsonToStorage(key, nextValue);
      return nextValue;
    });
  }, [key]);

  return [storedValue, setValue];
}
