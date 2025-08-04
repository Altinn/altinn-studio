import { useEffect, useState } from 'react';

function getMatches(query: string): boolean {
  return window.matchMedia(query).matches ?? false;
}

/**
 * Tracks whether a given CSS media query matches the current viewport/device state.
 *  */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => getMatches(query));

  useEffect(() => {
    setMatches(getMatches(query));

    const handleChange = (event: MediaQueryListEvent): void => {
      setMatches(event.matches);
    };

    const mediaQueryList = window.matchMedia(query);
    mediaQueryList.addEventListener('change', handleChange);
    return (): void => mediaQueryList.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}
