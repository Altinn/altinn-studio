import { useEffect, createContext, useContext } from 'react';
import './PageLayout.css';
import { matchPath, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router-dom';
import classes from './PageLayout.module.css';
import i18next from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import nb from '@altinn-studio/language/src/nb.json';
import en from '@altinn-studio/language/src/en.json';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { appContentWrapperId } from '@studio/testing/testids';
import { WebSocketSyncWrapper } from './WebSocketSyncWrapper';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useOrgListQuery } from 'app-shared/hooks/queries/useOrgListQuery';
import {
  StudioAlert,
  StudioParagraph,
  StudioCenter,
  StudioPageError,
  StudioPageSpinner,
} from '@studio/components';
import { NotFoundPage } from './NotFoundPage';
import { StudioPageLayout } from 'app-shared/components/StudioPageLayout/StudioPageLayout';
import type { Org } from 'app-shared/types/OrgList';
import type { User } from 'app-shared/types/Repository';

i18next.use(initReactI18next).init({
  ns: 'translation',
  defaultNS: 'translation',
  fallbackNS: 'translation',
  lng: DEFAULT_LANGUAGE,
  resources: {
    nb: { translation: nb },
    en: { translation: en },
  },
  fallbackLng: 'nb',
  react: {
    transSupportBasicHtmlNodes: true,
    transKeepBasicHtmlNodesFor: ['em'],
  },
});

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

export function PageLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { data: orgs, isPending: isOrgsPending } = useOrgListQuery();
  const { data: user, isPending: isUserPending } = useUserQuery();
  const match = matchPath({ path: '/:org', caseSensitive: true, end: false }, pathname);
  const { org } = match?.params ?? {};
  const navigate = useNavigate();

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

  const render = () => {
    if (!org) {
      return (
        <StudioCenter>
          <StudioAlert>
            <StudioParagraph data-size='md'>{t('admin.alert_no_org_selected')}</StudioParagraph>
            <StudioParagraph data-size='md'>
              {t('admin.alert_no_org_selected_no_access')}
            </StudioParagraph>
          </StudioAlert>
        </StudioCenter>
      );
    }

    if (!orgs?.[org]) {
      return <NotFoundPage />;
    }

    if (!user) {
      return <StudioPageError />;
    }

    return (
      <div className={classes.container}>
        <div data-testid={appContentWrapperId} className={classes.appContainer}>
          <WebSocketSyncWrapper>
            <OrgContext.Provider value={orgs[org]}>
              <UserContext.Provider value={user}>
                <Outlet />
              </UserContext.Provider>
            </OrgContext.Provider>
          </WebSocketSyncWrapper>
        </div>
        <ScrollRestoration />
      </div>
    );
  };

  return (
    <StudioPageLayout
      breadcrumbs={{
        items: [
          {
            onClick: () => navigate('/' + (org ? `${org}` : `user`)),
            label: t('admin.apps.title'),
          },
        ],
      }}
      onSelectAccount={(id: string, isOrg: boolean) => navigate(isOrg ? `/${id}` : '/')}
      currentAccountId={org ? org : user?.login}
    >
      {render()}
    </StudioPageLayout>
  );
}
