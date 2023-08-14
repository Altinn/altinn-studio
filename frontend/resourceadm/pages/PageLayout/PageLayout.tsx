import React, { useEffect, useMemo } from 'react';
import classes from './PageLayout.module.css';
import { Outlet, useNavigate } from 'react-router-dom';

import { HeaderContext } from 'app-shared/navigation/main-header/Header';
import type { IHeaderContext } from 'app-shared/navigation/main-header/Header';
import AppHeader from 'app-shared/navigation/main-header/Header';

import { userHasAccessToSelectedContext } from '../../utils/userUtils';
import { useOrganizationsQuery } from '../../hooks/queries';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';

export const PageLayout = () => {
  const { data: user } = useUserQuery();
  const { data: organizations } = useOrganizationsQuery();

  const selectedContext = useSelectedContext();
  const repo = `${selectedContext}-resources`;

  const navigate = useNavigate();

  useEffect(() => {
    if (
      organizations &&
      !userHasAccessToSelectedContext({ selectedContext, orgs: organizations })
    ) {
      navigate('/');
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
        {/* TODO - Find out if <AppHeader /> should be replaced to be the same as studio */}
        <AppHeader />
        <GiteaHeader
          org={selectedContext}
          app={repo}
          menuOnlyHasRepository
          className={classes.extraPadding}
        />
      </HeaderContext.Provider>
      <Outlet />
    </>
  );
};
