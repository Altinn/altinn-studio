import { useLocation, useNavigation } from 'react-router-dom';

export function useIsNavigating() {
  const isIdle = useNavigation().state === 'idle';
  const location = useLocation();
  const expectedLocation = `${location.pathname}${location.search}`.replace(/^\//, '');
  const locationIsUpToDate = window.location.hash.endsWith(expectedLocation);

  return !locationIsUpToDate || !isIdle;
}
