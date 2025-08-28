import { useEffect, useState } from 'react';

function getMatches(query: string): boolean {
  return window.matchMedia(query).matches ?? false;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => getMatches(query));

  useEffect(() => {
    const updateMatches = (): void => {
      setMatches(getMatches(query));
    };

    updateMatches();

    const mediaQueryList = window.matchMedia(query);
    mediaQueryList.addEventListener('change', updateMatches);
    return (): void => mediaQueryList.removeEventListener('change', updateMatches);
  }, [query]);

  return matches;
}
