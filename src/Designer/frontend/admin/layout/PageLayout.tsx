import React, { createContext, useContext, useEffect } from 'react';
import classes from './PageLayout.module.css';
import { Outlet, ScrollRestoration, useLocation, useParams } from 'react-router-dom';
import { useUserQuery } from 'app-shared/hooks/queries';
import { StudioCenter, StudioPageError, StudioPageSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useOrgListQuery } from 'app-shared/hooks/queries/useOrgListQuery';
import type { Org } from 'app-shared/types/OrgList';
import type { User } from 'app-shared/types/Repository';
import { NotFoundPage } from 'app-shared/routes/NotFoundPage';
import { WebSocketSyncWrapper } from './WebSocketSyncWrapper';
import { PageLayout as SharedPageLayout } from 'app-shared/layout';
import { AdminCenterNav } from './AdminCenterNav';

export const OrgContext = createContext<Org | null>(null);
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
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const { org } = useParams();
  const { data: orgs, isPending: isOrgsPending } = useOrgListQuery();
  const { data: user, isPending: isUserPending } = useUserQuery();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

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

  const orgName = orgs[org].name[i18n.language] ?? orgs[org].name['nb'];

  return (
    <div className={classes.container}>
      <div className={classes.appContainer}>
        <WebSocketSyncWrapper>
          <OrgContext.Provider value={orgs[org]}>
            <UserContext.Provider value={user}>
              <SharedPageLayout
                user={user}
                title={orgName}
                centerContent={<AdminCenterNav org={org} />}
              >
                <div className={classes.pageWrapper}>
                  <Outlet />
                </div>
              </SharedPageLayout>
            </UserContext.Provider>
          </OrgContext.Provider>
        </WebSocketSyncWrapper>
      </div>
      <ScrollRestoration />
    </div>
  );
};
