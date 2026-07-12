import { useEffect, useState } from 'react';
import { getStorageItem, setStorageItem, removeStorageItem } from '../utils/browserStorage';

/**
 * Fetches and caches a university favicon when logo settings are enabled.
 * Salvaged from the unused ApplicationCard component.
 */
export function useUniversityLogo(universityName: string): string | null {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const clearLogoCache = () => {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('university_logo_'))
        .forEach((k) => removeStorageItem(k));
      setLogoUrl(null);
    };

    if (!getStorageItem('fetch-logos-enabled') || !getStorageItem('showUniversityLogos')) {
      clearLogoCache();
      return () => {
        cancelled = true;
      };
    }

    const fetchLogo = async () => {
      const cacheKey = `university_logo_${universityName}`;
      const cached = getStorageItem(cacheKey);
      const cachedTs = getStorageItem(cacheKey + '_ts');
      const cacheValid =
        cached && cachedTs && Date.now() - parseInt(cachedTs, 10) < 7 * 86400 * 1000;
      if (cacheValid) {
        if (!cancelled) setLogoUrl(cached);
        return;
      }
      if (cached) {
        removeStorageItem(cacheKey);
        removeStorageItem(cacheKey + '_ts');
      }

      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const cleanName = universityName.split('(')[0].trim();
        const response = await fetch(
          `https://universities.hipolabs.com/search?name=${encodeURIComponent(cleanName)}`,
          { signal: controller.signal }
        );
        const data = await response.json();

        if (
          !cancelled &&
          data &&
          data.length > 0 &&
          data[0].domains &&
          data[0].domains.length > 0
        ) {
          const domain = data[0].domains[0];
          if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(domain)) {
            throw new Error('Invalid domain');
          }
          const faviconUrl = `https://${domain}/favicon.ico`;
          if (!cancelled) {
            setLogoUrl(faviconUrl);
            setStorageItem(cacheKey, faviconUrl);
            setStorageItem(cacheKey + '_ts', Date.now().toString());
          }
        }
      } catch (e) {
        if (!cancelled && !(e instanceof DOMException && e.name === 'AbortError')) {
          console.error('Failed to fetch logo', e);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    };

    if (universityName) {
      void fetchLogo();
    }

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [universityName]);

  return logoUrl;
}
