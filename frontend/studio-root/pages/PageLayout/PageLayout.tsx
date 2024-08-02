import AppHeader, { HeaderContext } from 'app-shared/navigation/main-header/Header';
import { Outlet } from 'react-router-dom';
import { useUserQuery } from 'app-shared/hooks/queries';
import React, { useMemo } from 'react';
import type { IHeaderContext } from 'app-shared/navigation/main-header/Header';
import classes from './PageLayout.module.css';

export const PageLayout = () => {
  const { data: user } = useUserQuery();

  const headerContextValue: IHeaderContext = useMemo(
    () => ({
      user,
    }),
    [user],
  );

  return (
    <div className={classes.root}>
      <HeaderContext.Provider value={headerContextValue}>
        <AppHeader showMenu={false} />
      </HeaderContext.Provider>
      <Outlet />
    </div>
  );
};
