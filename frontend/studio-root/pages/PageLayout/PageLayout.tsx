import { HeaderContext } from 'app-shared/navigation/main-header/Header';
import { Outlet } from 'react-router-dom';
import { useUserQuery } from 'app-shared/hooks/queries';
import React, { useMemo } from 'react';
import type { IHeaderContext } from 'app-shared/navigation/main-header/Header';
import { StudioPageHeader } from '@studio/components/';

export const PageLayout = () => {
  const { data: user } = useUserQuery();

  const headerContextValue: IHeaderContext = useMemo(
    () => ({
      user,
    }),
    [user],
  );

  return (
    <>
      <HeaderContext.Provider value={headerContextValue}>
        <StudioPageHeader>
          <StudioPageHeader.Main>
            <StudioPageHeader.Left />
          </StudioPageHeader.Main>
        </StudioPageHeader>
      </HeaderContext.Provider>
      <Outlet />
    </>
  );
};
