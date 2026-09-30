import React from 'react';

import { useBrowserWidth } from '@app/form-component';

import { useExpandedWidth } from 'src/features/form/layout/useExpandedWidth';
import { AppNavigation, AppNavigationHeading, appNavigationHeadingId } from 'src/features/navigation/AppNavigation';
import classes from 'src/features/navigation/SidebarNavigation.module.css';
import { SIDEBAR_BREAKPOINT, useHasGroupedNavigation } from 'src/features/navigation/utils';

export function SideBarNavigation() {
  const hasGroupedNavigation = useHasGroupedNavigation();
  const { expandedWidth } = useExpandedWidth();
  const isScreenLarge = useBrowserWidth((width) => width >= SIDEBAR_BREAKPOINT) && !expandedWidth;

  if (!hasGroupedNavigation || !isScreenLarge) {
    return null;
  }

  return (
    <nav
      className={classes.sidebarContainer}
      aria-labelledby={appNavigationHeadingId}
    >
      <AppNavigationHeading />
      <AppNavigation />
    </nav>
  );
}
