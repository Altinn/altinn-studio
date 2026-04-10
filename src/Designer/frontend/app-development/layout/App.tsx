import React, { useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import { Outlet, matchPath, useLocation, useNavigate } from 'react-router-dom';
import classes from './App.module.css';
import i18next from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import nb from '../../language/src/nb.json';
import en from '../../language/src/en.json';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { appContentWrapperId } from '@studio/testing/testids';
import { StudioPageLayout } from 'app-shared/components';
import { StudioAlert, StudioCenter, StudioPageSpinner } from '@studio/components';
import {
  InformationSquareIcon,
  PencilIcon,
  DatabaseIcon,
  FileTextIcon,
  RocketIcon,
  BranchingIcon,
  FolderIcon,
  ChatElipsisIcon,
} from '@studio/icons';
import { useOrgListQuery } from 'app-shared/hooks/queries/useOrgListQuery';
import { NotFoundPage } from './NotFoundPage';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

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

export function App() {
  const { pathname } = useLocation();
  const match = matchPath({ path: '/:org/:app', caseSensitive: true, end: false }, pathname);
  const org = match?.params?.org ?? '';
  const app = match?.params?.app ?? '';
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: orgs, isPending: orgsPending } = useOrgListQuery();
  const {
    data: repoStatus,
    isPending: isRepoStatusPending,
    error: repoStatusError,
  } = useRepoStatusQuery(org, app, {
    hideDefaultError: true,
  });

  const organization = orgs?.[org];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const onSelectAccount = (id: string) => {
    navigate(`/${id}/${app}`);
  };

  const items = useMemo(
    () => [
      {
        label: t('top_menu.about'),
        icon: { svgElement: InformationSquareIcon },
        selected: pathname.includes(`/${org}/${app}/overview`),
        onClick: () => navigate(`/${org}/${app}/overview`),
        link: `/${org}/${app}/overview`,
      },
      {
        label: t('top_menu.create'),
        icon: { svgElement: PencilIcon },
        selected: pathname.includes(`/${org}/${app}/ui-editor`),
        onClick: () => navigate(`/${org}/${app}/ui-editor`),
        link: `/${org}/${app}/ui-editor`,
      },
      {
        label: t('top_menu.data_model'),
        icon: { svgElement: DatabaseIcon },
        selected: pathname.includes(`/${org}/${app}/data-model`),
        onClick: () => navigate(`/${org}/${app}/data-model`),
        link: `/${org}/${app}/data-model`,
      },
      {
        label: t('top_menu.texts'),
        icon: { svgElement: FileTextIcon },
        selected: pathname.includes(`/${org}/${app}/text-editor`),
        onClick: () => navigate(`/${org}/${app}/text-editor`),
        link: `/${org}/${app}/text-editor`,
      },
      {
        label: t('top_menu.process_editor'),
        icon: { svgElement: BranchingIcon },
        selected: pathname.includes(`/${org}/${app}/process-editor`),
        onClick: () => navigate(`/${org}/${app}/process-editor`),
        link: `/${org}/${app}/process-editor`,
      },
      {
        label: t('top_menu.deploy'),
        icon: { svgElement: RocketIcon },
        selected: pathname.includes(`/${org}/${app}/deploy`),
        onClick: () => navigate(`/${org}/${app}/deploy`),
        link: `/${org}/${app}/deploy`,
      },
      {
        label: t('top_menu.content_library'),
        icon: { svgElement: FolderIcon },
        selected: pathname.includes(`/${org}/${app}/content-library`),
        onClick: () => navigate(`/${org}/${app}/content-library`),
        link: `/${org}/${app}/content-library`,
      },
      {
        label: t('top_menu.ai_assistant'),
        icon: { svgElement: ChatElipsisIcon },
        selected: pathname.includes(`/${org}/${app}/ai-assistant`),
        onClick: () => navigate(`/${org}/${app}/ai-assistant`),
        link: `/${org}/${app}/ai-assistant`,
      },
    ],
    [t, org, app, pathname],
  );

  const rootRef = useRef<ReactDOM.Root | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    const div = document.createElement('div');
    div.className = classes.headerMiddle;

    const renderItems = (root: ReactDOM.Root) => {
      root.render(
        <ul className={classes.headerMiddleList}>
          {itemsRef.current.map((item) => {
            const isSelected = pathname === item.link || pathname.startsWith(item.link + '/');
            const Icon = item.icon.svgElement;
            return (
              <li key={item.label}>
                <a
                  href={'/editor' + item.link}
                  className={isSelected ? classes.selected : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    item.onClick();
                  }}
                >
                  <Icon />
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>,
      );
    };

    const inject = (nav: Element) => {
      nav.insertAdjacentElement('beforebegin', div);
      rootRef.current = ReactDOM.createRoot(div);
      renderItems(rootRef.current);
    };

    const nav = document.querySelector('._nav_1iojv_53');
    if (nav) {
      inject(nav);
    } else {
      const observer = new MutationObserver(() => {
        const found = document.querySelector('._nav_1iojv_53');
        if (found) {
          observer.disconnect();
          inject(found);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      rootRef.current?.unmount();
      rootRef.current = null;
      div.remove();
    };
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;
    rootRef.current.render(
      <ul className={classes.headerMiddleList}>
        {items.map((item) => {
          const Icon = item.icon.svgElement;
          const isSelected = pathname === item.link || pathname.startsWith(item.link + '/');
          return (
            <li key={item.label}>
              <a
                href={'/editor' + item.link}
                className={isSelected ? classes.selected : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  item.onClick();
                }}
              >
                <Icon />
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>,
    );
  }, [items, navigate, pathname]);

  const render = () => {
    if (orgsPending || isRepoStatusPending) {
      return (
        <StudioCenter>
          <StudioPageSpinner spinnerTitle={t('repo_status.loading')} />
        </StudioCenter>
      );
    }

    // if (!orgs?.[org]) {
    //   return <NotFoundPage />;
    // }

    if (repoStatusError?.response?.status === ServerCodes.NotFound) {
      return (
        <div className={classes.alertContainer}>
          <StudioAlert data-color='info'>
            {app} finnes ikke i {organization?.name?.nb || org}.
          </StudioAlert>
        </div>
      );
    }

    return (
      <div className={classes.container}>
        <div data-testid={appContentWrapperId} className={classes.appContainer}>
          <Outlet />
        </div>
      </div>
    );
  };

  return (
    <StudioPageLayout
      breadcrumbs={{
        items: [
          {
            onClick: () => navigate('/' + (org ? `orgs/${org}` : `user`)),
            label: t('settings'),
          },
        ],
      }}
      currentAccountId={org}
      onSelectAccount={onSelectAccount}
      // sidebarItems={items}
      desktopMenuItems={items}
      mobileMenuItems={items}
      fullScreen={true}
      hideBreadcrumbs={true}
    >
      {render()}
    </StudioPageLayout>
  );
}
