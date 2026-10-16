import { useEffect, useState } from 'react';

import { breakpoints } from '@app/form-component/app-components/breakpoints/breakpoints';

export { breakpoints } from '@app/form-component/app-components/breakpoints/breakpoints';

type Condition = (width: number) => boolean;

const conditionIsMobile: Condition = (width) => width < breakpoints.sm;
const conditionIsTablet: Condition = (width) => width >= breakpoints.sm && width < breakpoints.md;
const conditionIsLaptop: Condition = (width) => width >= breakpoints.md && width < breakpoints.lg;
const conditionIsDesktop: Condition = (width) => width >= breakpoints.lg;
const conditionIsMobileOrTablet: Condition = (width) => width < breakpoints.md;
const conditionIsLgUp: Condition = (width) => width >= breakpoints.lg;

export function useIsMobile() {
  return useBrowserWidth(conditionIsMobile);
}

export function useIsTablet() {
  return useBrowserWidth(conditionIsTablet);
}

export function useIsLaptop() {
  return useBrowserWidth(conditionIsLaptop);
}

export function useIsDesktop() {
  return useBrowserWidth(conditionIsDesktop);
}

export function useIsMobileOrTablet() {
  return useBrowserWidth(conditionIsMobileOrTablet);
}

export function useIsLgUp() {
  return useBrowserWidth(conditionIsLgUp);
}

export function useBrowserWidth(condition: Condition) {
  const [state, setState] = useState(condition(window.innerWidth));

  useEffect(() => {
    const handleResize = () => setState(condition(window.innerWidth));
    window.addEventListener('resize', handleResize);
    handleResize(); // Size may have changed between render and effect
    return () => window.removeEventListener('resize', handleResize);
  }, [condition]);

  return state;
}
