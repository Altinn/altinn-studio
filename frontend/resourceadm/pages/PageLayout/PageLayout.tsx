import React, { useEffect, useMemo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import { HeaderContext } from 'app-shared/navigation/main-header/Header';
import type { IHeaderContext } from 'app-shared/navigation/main-header/Header';
import AppHeader from 'app-shared/navigation/main-header/Header';

import { userHasAccessToSelectedContext } from '../../utils/userUtils';
import { useOrganizationsQuery } from '../../hooks/useOrganizationQueries';
import { useUserQuery } from '../../hooks/useUserQueries';
import { useSelectedContext } from '../../hooks/useSelectedContext';

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
      navigate("/");
    }
  }, [organizations, selectedContext, user.login, navigate]);

  const headerContextValue: IHeaderContext = useMemo(
    () => ({
      selectableOrgs: organizations,
      user,
    }),
    [organizations, user]
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
