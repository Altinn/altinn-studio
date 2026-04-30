import { useEffect, useEffectEvent } from 'react';
import { useLocation } from 'react-router';
import type { Location } from 'react-router';

import { loadingAttribute, useHasElementsByAttribute } from 'src/components/ReadyForPrint';
import { useIsLoading } from 'src/core/loading/LoadingContext';
import {
  useHandledNavigationKey,
  useSetHandledNavigationKey,
} from 'src/features/navigation/NavigationFocusStateContext';
import type { NavigationState } from 'src/features/navigation/NavigationState';

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

  const handledNavigationKey = useHandledNavigationKey();
  const setHandledNavigationKey = useSetHandledNavigationKey();

  const handleOnNavigate = useEffectEvent((key: string, isLoading: boolean) => {
    if (handledNavigationKey === key) {
      return;
    }

    if (state?.preventFocusReset) {
      setHandledNavigationKey(key);
      return;
    }

    if (isLoading) {
      return;
    }

    document.getElementById('main-content')?.focus({ preventScroll: true });
    setHandledNavigationKey(key);
  });

  useEffect(() => {
    handleOnNavigate(key, isLoading);
  }, [key, isLoading]);

  return null;
}
