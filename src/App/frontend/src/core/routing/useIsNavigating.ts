import { useLocation, useNavigation } from 'react-router-dom';

// TODO: make this redundant
export function useIsNavigating() {
  const isIdle = useNavigation().state === 'idle';
  const location = useLocation();
  const expectedLocation = `${location.pathname}${location.search}`.replace(/^\//, '');
  const locationIsUpToDate = `${window.location.pathname}${window.location.search}`.endsWith(expectedLocation);

  return !locationIsUpToDate || !isIdle;
}
