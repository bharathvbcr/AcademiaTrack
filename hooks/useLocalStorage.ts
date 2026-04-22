import React, { useEffect, useState } from 'react';
import { getLocalStorage, readJsonFromStorage, writeJsonToStorage } from '../utils/browserStorage';

export function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    const item = readJsonFromStorage<T>(key);
    return item ?? initialValue;
  });

  useEffect(() => {
    if (!getLocalStorage()) {
      return;
    }

    writeJsonToStorage(key, storedValue);
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
