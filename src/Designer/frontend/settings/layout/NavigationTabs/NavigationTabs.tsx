import type { ReactElement } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { StudioTabs } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useOrganizationsQuery } from 'app-shared/hooks/queries';

const USER_TAB = 'user';

export const NavigationTabs = (): ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: organizations } = useOrganizationsQuery();

  if (!organizations?.length) return null;

  const activeTab = deriveActiveTab(pathname);

  return (
    <StudioTabs value={activeTab} onChange={(value) => navigate(`/${value}`)}>
      <StudioTabs.List>
        <StudioTabs.Tab value={USER_TAB}>{t('settings.navigation.user')}</StudioTabs.Tab>
        {organizations.map((org) => (
          <StudioTabs.Tab key={org.username} value={`orgs/${org.username}`}>
            {org.full_name || org.username}
          </StudioTabs.Tab>
        ))}
      </StudioTabs.List>
    </StudioTabs>
  );
};

function deriveActiveTab(pathname: string): string {
  const segments = pathname.replace(/^\//, '').split('/');
  if (segments[0] === 'orgs' && segments[1]) {
    return `orgs/${segments[1]}`;
  }
  return USER_TAB;
}
