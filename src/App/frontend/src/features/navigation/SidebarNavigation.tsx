import React from 'react';

import { useUiConfigContext } from 'src/features/form/layout/UiConfigContext';
import { AppNavigation, AppNavigationHeading, appNavigationHeadingId } from 'src/features/navigation/AppNavigation';
import classes from 'src/features/navigation/SidebarNavigation.module.css';
import { SIDEBAR_BREAKPOINT, useHasGroupedNavigation } from 'src/features/navigation/utils';
import { useBrowserWidth } from 'src/hooks/useDeviceWidths';

export function SideBarNavigation() {
  const hasGroupedNavigation = useHasGroupedNavigation();
  const { expandedWidth } = useUiConfigContext();
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
