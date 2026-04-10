import { matchPath, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldLockIcon } from '@studio/icons';
import type { StudioPageLayoutSidebarItem } from 'app-shared/components/StudioPageLayout/StudioPageLayout';
import { StudioPageLayout } from 'app-shared/components';
import { RoutePaths as UserRoutePaths } from 'settings/features/user/routes/RoutePaths';
import { RoutePaths as OrgsRoutePaths } from 'settings/features/orgs/routes/RoutePaths';
import { useUserQuery } from 'app-shared/hooks/queries/useUserQuery';
import { useOrganizationsQuery } from 'app-shared/hooks/queries/useOrganizationsQuery';
import './PageLayout.css';

export const PageLayout = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { data: user } = useUserQuery();
  const { data: orgs } = useOrganizationsQuery();

  const match = matchPath({ path: 'orgs/:org', caseSensitive: true, end: false }, pathname);
  const { org } = match?.params ?? {};
  const currentAccountId = org ?? user?.login;
  const isCompany = orgs?.some((o) => o.username === currentAccountId) ?? false;
  const navigate = useNavigate();

  const sidebarItems: StudioPageLayoutSidebarItem[] = isCompany
    ? [
        {
          id: OrgsRoutePaths.ContactPoints,
          label: t('settings.orgs.contact_points.menu.contact_points'),
          icon: { svgElement: ShieldLockIcon },
          onClick: () =>
            navigate(
              `/${OrgsRoutePaths.Org.replace(':org', org ?? '')}/${OrgsRoutePaths.ContactPoints}`,
            ),
          selected: pathname.includes(
            `/${OrgsRoutePaths.Org.replace(':org', org ?? '')}/${OrgsRoutePaths.ContactPoints}`,
          ),
        },
      ]
    : [
        {
          id: UserRoutePaths.ApiKeys,
          label: t('settings.user.api_keys.api_keys'),
          icon: { svgElement: ShieldLockIcon },
          onClick: () => navigate(`/${UserRoutePaths.User}/${UserRoutePaths.ApiKeys}`),
          selected: pathname.includes(`/${UserRoutePaths.User}/${UserRoutePaths.ApiKeys}`),
        },
      ];

  return (
    <StudioPageLayout
      sidebarItems={sidebarItems}
      breadcrumbs={{
        items: [
          {
            onClick: () => navigate('/' + (org ? `orgs/${org}` : `user`)),
            label: t('settings'),
          },
        ],
      }}
      onSelectAccount={(id: string, isOrg: boolean) => navigate(isOrg ? `/orgs/${id}` : '/')}
      currentAccountId={org ? `${org}` : `${user?.login}`}
    >
      <Outlet />
    </StudioPageLayout>
  );
};
