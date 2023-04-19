import { HeaderContext, SelectedContextType } from 'app-shared/navigation/main-header/Header';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { useOrganizationsQuery } from 'dashboard/hooks/useOrganizationQueries';
import { useUserQuery } from 'dashboard/hooks/useUserQueries';
import React, { useEffect, useMemo } from 'react';
import type { IHeaderContext } from 'app-shared/navigation/main-header/Header';
import AppHeader from 'app-shared/navigation/main-header/Header';
import { userHasAccessToSelectedContext } from '../../utils/userUtils';

export const PageLayout = () => {
  const { data: user } = useUserQuery();
  const { data: organizations } = useOrganizationsQuery();

  const { selectedContext = SelectedContextType.Self } = useParams();
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
