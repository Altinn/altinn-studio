import { useEffect, useState } from 'react';

function getInitialMatches(query: string): boolean {
  return window.matchMedia(query).matches ?? false;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(getInitialMatches(query));

  useEffect(() => {
    const handleChange = (event: MediaQueryListEvent): void => {
      setMatches(event.matches);
    };

    const mediaQueryList = window.matchMedia(query);
    mediaQueryList.addEventListener('change', handleChange);
    return (): void => mediaQueryList.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}
