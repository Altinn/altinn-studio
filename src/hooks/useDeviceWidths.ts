import { useEffect, useState } from 'react';

export const breakpoints = {
  mini: 600,
  mobile: 768,
  tablet: 992,
};

type Condition = (width: number) => boolean;

const conditionIsMini: Condition = (width) => width <= breakpoints.mini;
const conditionIsMobile: Condition = (width) => width <= breakpoints.mobile;
const conditionIsTablet: Condition = (width) => width > breakpoints.mobile && width <= breakpoints.tablet;
const conditionIsDesktop: Condition = (width) => width > breakpoints.tablet;
const conditionIsMobileOrTablet: Condition = (width) => width <= breakpoints.tablet;

export function useIsMini() {
  return useBrowserWidth(conditionIsMini);
}

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
