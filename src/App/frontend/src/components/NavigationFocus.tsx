import { useEffect, useEffectEvent, useRef } from 'react';
import { useLocation } from 'react-router';
import type { Location } from 'react-router';

import { loadingAttribute, useHasElementsByAttribute } from 'src/components/ReadyForPrint';
import { useIsLoading } from 'src/core/loading/LoadingContext';
import type { NavigationState } from 'src/types/NavigationState';

/**
 * Moves focus to #main-content on every navigation, unless the navigation was
 * performed with `state: { preventFocusReset: true }`. Mirrors the opt-out
 * pattern used for `preventScrollReset`.
 *
 * Render this component once in the application.
 */
export function NavigationFocus(): null {
  const { key, state }: Location<NavigationState | undefined> = useLocation();
  const isLoadingResult = useIsLoading();
  const hasLoaders = useHasElementsByAttribute(loadingAttribute);
  const isLoading = isLoadingResult || hasLoaders;

  // We don't want to move focus on first render, so we mark the current navigation key as handled.
  const handledKeyRef = useRef<string | null>(key);

  const handleOnNavigate = useEffectEvent((key: string, isLoading: boolean) => {
    if (handledKeyRef.current === key) {
      return;
    }

    if (state?.preventFocusReset) {
      handledKeyRef.current = key;
      return;
    }

    if (isLoading) {
      return;
    }

    document.getElementById('main-content')?.focus({ preventScroll: true });
    handledKeyRef.current = key;
  });

  useEffect(() => {
    handleOnNavigate(key, isLoading);
  }, [key, isLoading]);

  return null;
}
