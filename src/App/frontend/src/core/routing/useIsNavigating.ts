import { useLocation, useNavigation } from 'react-router-dom';

export function useIsNavigating() {
  const isIdle = useNavigation().state === 'idle';
  const location = useLocation();
  const expectedLocation = `${location.pathname}${location.search}`;
  const actualLocation = `${window.location.pathname}${window.location.search}`;
  const locationIsUpToDate = actualLocation === expectedLocation;

  return !locationIsUpToDate || !isIdle;
}
