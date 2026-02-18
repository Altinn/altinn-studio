import React from 'react';
import { Outlet } from 'react-router-dom';

import cn from 'classnames';

import classes from 'src/components/presentation/Presentation.module.css';

export function RootLayout() {
  return (
    <div
      data-testid='presentation'
      className={cn(classes.container, {
        [classes.withNavigation]: false,
        [classes.expanded]: false,
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
