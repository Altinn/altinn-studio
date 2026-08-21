import { useEffect, useState } from 'react';

import { breakpoints } from '@app/form-component/app-components/Flex/breakpoints';

export { breakpoints } from '@app/form-component/app-components/Flex/breakpoints';

type Condition = (width: number) => boolean;

const conditionIsMobile: Condition = (width) => width < breakpoints.sm;
const conditionIsTablet: Condition = (width) => width >= breakpoints.sm && width < breakpoints.md;
const conditionIsDesktop: Condition = (width) => width >= breakpoints.md;
const conditionIsMobileOrTablet: Condition = (width) => width < breakpoints.md;

export function useIsMobile() {
  return useBrowserWidth(conditionIsMobile);
}

export function useIsTablet() {
  return useBrowserWidth(conditionIsTablet);
}

export function useIsDesktop() {
  return useBrowserWidth(conditionIsDesktop);
}

export function useIsMobileOrTablet() {
  return useBrowserWidth(conditionIsMobileOrTablet);
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
