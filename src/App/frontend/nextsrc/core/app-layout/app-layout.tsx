import React, { useLayoutEffect } from 'react';
import { Outlet } from 'react-router';

import cn from 'classnames';
import { AltinnAppHeader } from 'nextsrc/core/app-layout/AltinnAppHeader';
import { AppFooter } from 'nextsrc/core/app-layout/AppFooter';
import { AppHeader } from 'nextsrc/core/app-layout/AppHeader';
import { useIsMobile, useIsTablet } from 'nextsrc/utils/useDeviceWidths';

import classes from 'src/components/presentation/Presentation.module.css';

export function AppLayout() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  useLayoutEffect(() => {
    document.body.style.background = '#EFEFEF';
  }, []);

  return (
    <>
      <AltinnAppHeader />
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
            <AppHeader />
            <div className={classes.modalBody}>
              <Outlet />
            </div>
          </section>
        </main>
        <AppFooter />
      </div>
    </>
  );
}
