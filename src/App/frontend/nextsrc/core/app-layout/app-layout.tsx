import React from 'react';
import { Outlet } from 'react-router';

import cn from 'classnames';
import { useIsMobile, useIsTablet } from 'nextsrc/utils/useDeviceWidths';

import classes from 'src/components/presentation/Presentation.module.css';

export function AppLayout() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  return (
    <div
      data-testid='presentation'
      className={cn(classes.container, {
        [classes.withNavigation]: false,
        [classes.expanded]: false,
        'viewport-is-mobile': isMobile,
        'viewport-is-tablet': isTablet && !isMobile,
        'viewport-is-desktop': !isTablet && !isMobile,
      })}
    >
      <main className={classes.page}>
        <section
          id='main-content'
          className={classes.modal}
          tabIndex={-1}
        >
          <div className={classes.modalBody}>
            <Outlet />
          </div>
        </section>
      </main>
    </div>
  );
}
