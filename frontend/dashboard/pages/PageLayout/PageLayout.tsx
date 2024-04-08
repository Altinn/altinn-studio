import AppHeader, { HeaderContext } from 'app-shared/navigation/main-header/Header';
import { Outlet, useNavigate } from 'react-router-dom';
import { useOrganizationsQuery } from 'dashboard/hooks/queries';
import { useUserQuery } from 'app-shared/hooks/queries';
import React, { useEffect, useMemo } from 'react';
import type { IHeaderContext } from 'app-shared/navigation/main-header/Header';

import { userHasAccessToSelectedContext } from '../../utils/userUtils';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { DASHBOARD_ROOT_ROUTE } from 'app-shared/constants';

export const PageLayout = () => {
  const { data: user } = useUserQuery();
  const { data: organizations } = useOrganizationsQuery();

  const selectedContext = useSelectedContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (
      organizations &&
      !userHasAccessToSelectedContext({ selectedContext, orgs: organizations })
    ) {
      navigate(DASHBOARD_ROOT_ROUTE);
    }
  }, [organizations, selectedContext, user.login, navigate]);

  const headerContextValue: IHeaderContext = useMemo(
    () => ({
      selectableOrgs: organizations,
      user,
    }),
    [organizations, user],
  );

  return (
    <>
      <HeaderContext.Provider value={headerContextValue}>
        <AppHeader />
      </HeaderContext.Provider>
      <Outlet />
    </>
  );
};
