import React, { createContext, useContext } from 'react';
import { Outlet, matchPath, useLocation } from 'react-router-dom';
import { PageHeader } from './PageHeader';
import { useOrganizationsQuery, useUserQuery } from 'app-shared/hooks/queries';
import { StudioCenter, StudioPageError, StudioPageSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { Organization } from 'app-shared/types/Organization';
import type { User } from 'app-shared/types/Repository';
import { NotFoundPage } from '../pages/NotFoundPage/NotFoundPage';
import { NoOrgSelected } from 'admin/pages/NoOrgSelected/NoOrgSelected';

export const OrgContext = createContext<Organization | null>(null);
const UserContext = createContext<User | null>(null);

export function useCurrentOrg(): Organization {
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
  const { data: organizations, isPending: isOrgsPending } = useOrganizationsQuery();
  const { data: user, isPending: isUserPending } = useUserQuery();

  if (isUserPending || isOrgsPending) {
    return (
      <StudioCenter>
        <StudioPageSpinner spinnerTitle={t('repo_status.loading')} />
      </StudioCenter>
    );
  }

  if (!user) {
    return <StudioPageError />;
  }

  const currentOrg = org ? ((organizations ?? []).find((o) => o.username === org) ?? null) : null;

  const render = () => {
    if (!org) {
      return <NoOrgSelected />;
    }

    if (!currentOrg) {
      return <NotFoundPage />;
    }

    return <Outlet />;
  };

  return (
    <OrgContext.Provider value={currentOrg}>
      <UserContext.Provider value={user}>
        <PageHeader />
        {render()}
      </UserContext.Provider>
    </OrgContext.Provider>
  );
};
