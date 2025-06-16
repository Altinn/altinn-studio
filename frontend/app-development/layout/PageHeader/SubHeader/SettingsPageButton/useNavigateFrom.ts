import { useLocation } from 'react-router-dom';
import { typedLocalStorage, UrlUtils } from '@studio/pure-functions';
import type { RoutePaths } from 'app-development/enums/RoutePaths';
import { LocalStorageKey } from 'app-shared/enums/LocalStorageKey';

type LocationState = {
  from?: RoutePaths;
} | null;

export const useNavigateFrom = () => {
  const location = useLocation();
  const state = location.state as LocationState;

  const navigateFrom: RoutePaths | undefined = getNavigateFrom(state);
  const currentRoutePath: string = UrlUtils.extractThirdRouterParam(location.pathname);
  const search: string = location?.search ?? '';

  return {
    navigateFrom,
    currentRoutePath: `${currentRoutePath}${search}`,
  };
};

function getNavigateFrom(locationState: LocationState): RoutePaths | undefined {
  const previousRouteBeforeSettings = typedLocalStorage.getItem<RoutePaths>(
    LocalStorageKey.PreviousRouteBeforeSettings,
  );

  if (locationState?.from) {
    typedLocalStorage.setItem(LocalStorageKey.PreviousRouteBeforeSettings, locationState.from);
    return locationState.from;
  }
  if (previousRouteBeforeSettings) {
    return previousRouteBeforeSettings;
  }
  return undefined;
}
