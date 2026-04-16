import type { ReactElement } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { StudioPageHeader } from '@studio/components';
import { useTranslation } from 'react-i18next';
import './PageLayout.css';
import { DISPLAY_NAME, MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { useMediaQuery } from '@studio/hooks';
import { FeatureFlag, useFeatureFlag } from '@studio/feature-flags';
import { StudioProfileMenuComponent } from 'app-shared/components';

export const PageHeader = () => {
  const shouldDisplayDesktopMenu = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);

  return (
    <div data-color-scheme='dark'>
      <StudioPageHeader>
        <StudioPageHeader.Main>
          <StudioPageHeader.Left title={DISPLAY_NAME} showTitle={shouldDisplayDesktopMenu} />
          {shouldDisplayDesktopMenu && <CenterContent />}
          <StudioPageHeader.Right>
            <ProfileMenu />
          </StudioPageHeader.Right>
        </StudioPageHeader.Main>
      </StudioPageHeader>
    </div>
  );
};

const CenterContent = (): ReactElement => {
  const { t } = useTranslation();
  const orgMatch = useMatch('/orgs/:org/*');
  const activeOrgUsername = orgMatch?.params.org ?? null;
  const dashboardContext = activeOrgUsername ?? 'self';
  const adminEnabled = useFeatureFlag(FeatureFlag.Admin);

  return (
    <StudioPageHeader.Center>
      <StudioPageHeader.HeaderLink
        renderLink={(props) => (
          <a href={`/dashboard/app-dashboard/${dashboardContext}`} {...props}>
            <span>{t('dashboard.header_item_dashboard')}</span>
          </a>
        )}
      />
      {adminEnabled && (
        <StudioPageHeader.HeaderLink
          renderLink={(props) => (
            <a
              href={dashboardContext === 'self' ? '/admin' : `/admin/${dashboardContext}`}
              {...props}
            >
              <span>{t('admin.apps.title')}</span>
            </a>
          )}
        />
      )}
      <StudioPageHeader.HeaderLink
        isBeta={true}
        renderLink={(props) => (
          <a href={`/dashboard/org-library/${dashboardContext}`} {...props}>
            <span>{t('dashboard.header_item_library')}</span>
          </a>
        )}
      />
    </StudioPageHeader.Center>
  );
};

const ProfileMenu = (): ReactElement => {
  const navigate = useNavigate();
  const orgMatch = useMatch('/orgs/:org/*');
  const subPath = orgMatch?.params['*'] || '';
  const orgPath = (username: string) =>
    subPath ? `/orgs/${username}/${subPath}` : `/orgs/${username}`;

  return (
    <StudioProfileMenuComponent
      onOrgClick={(org) => navigate(orgPath(org.username))}
      onUserClick={() => navigate('/user')}
    />
  );
};
