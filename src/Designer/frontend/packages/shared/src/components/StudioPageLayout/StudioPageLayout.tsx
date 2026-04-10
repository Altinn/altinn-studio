import { useEffect, useMemo, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { BreadcrumbsProps, Account, IconProps, SvgElement } from '@altinn/altinn-components';
import {
  Buildings2Icon,
  CogIcon,
  CodeIcon,
  HouseIcon,
  ShieldCheckmarkIcon,
  FolderIcon,
} from '@studio/icons';
import { StudioCenter, StudioLayout, StudioPageSpinner } from '@studio/components';
import { useUserQuery } from 'app-shared/hooks/queries/useUserQuery';
import { useOrganizationsQuery } from 'app-shared/hooks/queries/useOrganizationsQuery';
import { useLogoutMutation } from 'app-shared/hooks/mutations/useLogoutMutation';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import cn from 'classnames';
import classes from './StudioPageLayout.module.css';
import './StudioPageLayout.css';
import { typedSessionStorage } from '@studio/pure-functions';

/**
 * IMPORTANT: The consuming application must import
 * '@altinn/altinn-components/dist/global.css' in its entry point or layout file.
 * This component does not import it to avoid duplicate CSS injection.
 */

export type LanguageCode = 'nb' | 'nn' | 'en';

/** Minimal user shape required to build account entries. */
export interface StudioPageLayoutUser {
  login: string;
  full_name?: string;
  avatar_url?: string;
}

/** Minimal organization shape required to build account entries. */
export interface StudioPageLayoutOrganization {
  username: string;
  full_name?: string;
  avatar_url?: string;
}

export interface StudioPageLayoutSidebarItem {
  id?: string;
  label: string;
  icon: IconProps | SvgElement;
  href?: string;
  selected?: boolean;
  onClick?: () => void;
}

export interface StudioPageLayoutDesktopMenuItem {
  groupId?: string;
  label: string;
  icon: IconProps | SvgElement;
  href?: string;
  selected?: boolean;
  hidden?: boolean;
  onClick?: () => void;
}

export interface StudioPageLayoutDesktopMenuLabels {
  home: string;
  apps: string;
  library: string;
  settings: string;
  gitea: string;
}

export interface StudioPageLayoutGlobalMenu {
  menuLabel: string;
  backLabel: string;
  changeLabel: string;
  logoutButton: { label: string; onClick: () => void };
}

export interface StudioPageLayoutProps {
  sidebarItems?: StudioPageLayoutSidebarItem[];
  breadcrumbs?: BreadcrumbsProps;
  hideBreadcrumbs?: boolean;
  onSelectAccount?: (accountId: string, isOrg: boolean) => void;
  currentAccountId?: string;
  desktopMenuItems?: StudioPageLayoutDesktopMenuItem[];
  mobileMenuItems?: StudioPageLayoutDesktopMenuItem[];
  fullScreen?: boolean;
  children: ReactNode;
}

const buildAccounts = (
  user: StudioPageLayoutUser,
  organizations: StudioPageLayoutOrganization[],
): Account[] => [
  {
    id: user.login, // user.login and org.username are unique across users and orgs in gitea, so we can use them directly as IDs
    type: 'person',
    name: user.full_name || user.login,
    description: user.login,
    icon: {
      name: user.login,
      imageUrlAlt: user.full_name || user.login,
      imageUrl: user.avatar_url,
    },
  },
  ...organizations.map((org) => ({
    id: org.username, // user.login and org.username are unique across users and orgs in gitea, so we can use them directly as IDs
    type: 'company' as const,
    name: org.full_name || org.username,
    description: org.username,
    icon: {
      name: org.username,
      imageUrlAlt: org.full_name || org.username,
      imageUrl: org.avatar_url,
    },
  })),
];

export const StudioPageLayout = ({
  sidebarItems = [],
  breadcrumbs = { items: [] },
  hideBreadcrumbs = false,
  onSelectAccount,
  currentAccountId,
  desktopMenuItems = [],
  mobileMenuItems = [],
  fullScreen = false,
  children,
}: StudioPageLayoutProps) => {
  const { data: user, isPending: isUserPending } = useUserQuery();
  const { data: orgs, isPending: isOrgsPending } = useOrganizationsQuery();
  const { mutate: logout } = useLogoutMutation();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const commonAccounts = useMemo(
    () => buildAccounts(user ?? { login: '' }, orgs ?? []),
    [user, orgs],
  );
  const navigate = useNavigate();

  useEffect(() => {
    const el = document.querySelector('header [class*="_text_"]');
    if (el) el.textContent = 'Altinn Studio';
  }, [pathname]);

  if (isUserPending || isOrgsPending) {
    return (
      <StudioCenter>
        <StudioPageSpinner spinnerTitle={t('repo_status.loading')} />
      </StudioCenter>
    );
  }

  const footer = {
    address: 'Postboks 1382 Vika, 0114 Oslo.',
    address2: 'Org.nr. 991 825 827',
    menu: {
      items: [
        {
          id: 'help',
          href: '/info/contact',
          title: t('footer.help_and_contact'),
        },
        {
          id: 'accessibility',
          href: altinnDocsUrl({ relativeUrl: 'altinn-studio/about/accessibility/' }),
          title: t('footer.accessibility'),
        },
        { id: 'docs', href: altinnDocsUrl(), title: t('dashboard.resource_docs_label') },
        {
          id: 'figma',
          href: 'https://www.figma.com/community/file/1344307804742953785',
          title: t('dashboard.resource_design_label'),
        },
        {
          id: 'roadmap',
          href: altinnDocsUrl({ relativeUrl: 'community/roadmap/' }),
          title: t('dashboard.resource_roadmap_label'),
        },
        {
          id: 'orgs',
          href: `${window.location.origin}/repos/explore/organizations`,
          title: t('dashboard.resource_organisations_label2'),
        },
        {
          id: 'status',
          href: 'https://status.digdir.no/',
          title: t('dashboard.resource_status_label'),
        },
      ],
    },
  };

  const isOrg = orgs.some((org) => org.username === currentAccountId);

  const homeItem = {
    groupId: 'home',
    label: t('general.home'),
    icon: { svgElement: HouseIcon },
    selected: pathname === '/',
    href: '/',
  };

  const commonMenuItems: StudioPageLayoutDesktopMenuItem[] = [
    {
      groupId: 'navigation2',
      label: t('admin.apps.title'),
      icon: { svgElement: ShieldCheckmarkIcon },
      // hidden: !isOrg,
      selected: pathname.includes('/admin'),
      href: '/admin/' + (isOrg ? currentAccountId : ''),
    },
    {
      groupId: 'navigation2',
      label: t('dashboard.header_item_library'),
      icon: { svgElement: FolderIcon },
      // hidden: !isOrg,
      selected: pathname.includes('/dashboard/org-library'),
      href: '/dashboard/org-library/' + (isOrg ? currentAccountId : ''),
    },
    {
      groupId: 'navigation2',
      label: t('dashboard.resources'),
      icon: { svgElement: Buildings2Icon },
      // hidden: !isOrg,
      selected: pathname.includes('/dashboard/org-library'),
      href: `/resourceadm/${currentAccountId}/${currentAccountId}-resources`,
    },
    {
      label: t('settings'),
      icon: { svgElement: CogIcon },
      selected: pathname.includes('/settings/'),
      href: isOrg ? `/settings/orgs/${currentAccountId}` : '/settings/user',
    },
    {
      label: t('shared.header_go_to_gitea'),
      icon: { svgElement: CodeIcon },
      href: isOrg ? `/repos/${currentAccountId}` : '/repos',
    },
  ];

  const globalMenu = {
    menuLabel: t('general.menu'),
    backLabel: t('shared.header_go_back'),
    changeLabel: t('shared.header_change_account'),
  };

  const currentAccount = commonAccounts.find((a) => a.id === currentAccountId) ?? commonAccounts[0];

  return (
    <div className={cn(classes.container, { [classes.fullScreen]: fullScreen })}>
      <StudioLayout
        languageCode='nb'
        color={currentAccount.type as 'neutral' | 'company' | 'person'}
        footer={footer}
        sidebar={sidebarItems.length > 0 ? { menu: { items: sidebarItems } } : undefined}
        content={{ color: currentAccount.type as 'neutral' | 'company' | 'person' }}
        breadcrumbs={
          hideBreadcrumbs
            ? undefined
            : {
                ...breadcrumbs,
                items: [{ href: '/', label: t('general.home') }, ...breadcrumbs.items],
              }
        }
        header={{
          logo: {
            title: t('shared.header_logo_alt_text'),
            onClick: () => navigate('/'),
          },
          globalMenu: {
            menuLabel: globalMenu.menuLabel,
            backLabel: globalMenu.backLabel,
            changeLabel: globalMenu.changeLabel,
            logoutButton: { label: t('shared.header_logout'), onClick: () => logout() },
          },
          accountSelector: {
            accountMenu: {
              currentAccount,
              keyboardEvents: true,
              // search: { name: 'account-search', hidden: accounts.length < 5 },
              onSelectAccount: (id: string) => {
                typedSessionStorage.setItem('dashboard::selectedContext', id);
                onSelectAccount(
                  id,
                  orgs.some((org) => org.username === id),
                );
              },
              groups: {
                persons: { divider: true, title: 'Personer' },
                companies: { divider: true, title: 'Virksomheter' },
              },
              items: [
                ...commonAccounts
                  .map((account) => ({
                    groupId: 'persons',
                    id: account.id,
                    type: account.type,
                    name: account.name,
                    description: account.description,
                    icon: account.icon,
                    selected: account.id === currentAccount.id,
                  }))
                  .filter((account) => account.type === 'person'),
                ...commonAccounts
                  .map((account) => ({
                    groupId: 'companies',
                    id: account.id,
                    type: account.type,
                    name: account.name,
                    description: account.description,
                    icon: account.icon,
                    selected: account.id === currentAccount.id,
                  }))
                  .filter((account) => account.type === 'company'),
              ],
            },
          },
          desktopMenu: {
            color: currentAccount.type,
            keyboardEvents: true,
            groups: {
              home: { divider: true },
              navigation1: { divider: true },
              navigation2: { divider: true },
            },
            items: [
              homeItem,
              ...desktopMenuItems.map((item) => ({ ...item, groupId: 'navigation1' })),
              ...commonMenuItems,
            ],
          },
          mobileMenu: {
            color: currentAccount.type,
            keyboardEvents: true,
            groups: {
              home: { divider: true },
              navigation1: { divider: true },
              navigation2: { divider: true },
            },
            items: [
              homeItem,
              ...mobileMenuItems.map((item) => ({ ...item, groupId: 'navigation1' })),
              ...commonMenuItems,
            ],
          },
        }}
      >
        {children}
      </StudioLayout>
    </div>
  );
};
