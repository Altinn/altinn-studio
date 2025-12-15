import React, { createContext, useContext } from 'react';
import classes from './PageLayout.module.css';
import { Outlet, matchPath, useLocation } from 'react-router-dom';
import { PageHeader } from './PageHeader';
import { useUserQuery } from 'app-shared/hooks/queries';
import { StudioCenter, StudioPageError, StudioPageSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useOrgListQuery } from 'app-shared/hooks/queries/useOrgListQuery';
import type { Org } from 'app-shared/types/OrgList';
import type { User } from 'app-shared/types/Repository';
import { NotFoundPage } from './NotFoundPage';

const OrgContext = createContext<Org | null>(null);
const UserContext = createContext<User | null>(null);

export function useCurrentOrg(): Org {
  const org = useContext(OrgContext);
  if (!org) {
    throw new Error('Current org is not defined');
  }
  return org;
}

export function useCurrentUser(): User {
  const user = useContext(UserContext);
  if (!user) {
    throw new Error('Current user is not defined');
  }
  return user;
}

export const PageLayout = (): React.ReactNode => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const match = matchPath({ path: '/:org', caseSensitive: true, end: false }, pathname);
  const { org } = match?.params ?? {};
  const { data: orgs, isPending: isOrgsPending } = useOrgListQuery();
  const { data: user, isPending: isUserPending } = useUserQuery();

  if (isUserPending || isOrgsPending) {
    return (
      <StudioCenter>
        <StudioPageSpinner spinnerTitle={t('repo_status.loading')} />
      </StudioCenter>
    );
  }

  if (!org || !orgs?.[org]) {
    return <NotFoundPage />;
  }

  if (!user) {
    return <StudioPageError />;
  }

  return (
    <OrgContext.Provider value={orgs[org]}>
      <UserContext.Provider value={user}>
        <PageHeader />
        <div className={classes.pageWrapper}>
          <Outlet />
        </div>
      </UserContext.Provider>
    </OrgContext.Provider>
  );
};
