import { useMediaQuery } from '@material-ui/core';

export const breakpoints = {
  mobile: 768,
  tablet: 992,
};

export function useIsMobile() {
  return useMediaQuery(`(max-width:${breakpoints.mobile}px)`);
}

export function useIsTablet() {
  return useMediaQuery(`(min-width:${breakpoints.mobile}px) and (max-width:${breakpoints.tablet}px)`);
}

export function useIsDesktop() {
  return useMediaQuery(`(min-width:${breakpoints.tablet}px)`);
}

export function useIsMobileOrTablet() {
  return useMediaQuery(`(max-width:${breakpoints.tablet}px)`);
}
