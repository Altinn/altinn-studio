import classes from './PageHeader.module.css';
import { DISPLAY_NAME, MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { StudioPageHeader } from '@studio/components';
import { useMediaQuery } from '@studio/hooks';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useMatch, useNavigate, useParams } from 'react-router-dom';
import { RoutePaths } from 'admin/enums/RoutePaths';
import { FeatureFlag, useFeatureFlag } from '@studio/feature-flags';
import { ProfileMenu } from 'app-shared/components';

export const PageHeader = (): ReactElement => {
  const shouldDisplayDesktopMenu = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);

  return (
    <div data-color-scheme='dark'>
      <StudioPageHeader>
        <StudioPageHeader.Main>
          <StudioPageHeader.Left showTitle={shouldDisplayDesktopMenu} title={DISPLAY_NAME} />
          {shouldDisplayDesktopMenu && <CenterContent />}
          <StudioPageHeader.Right>
            <RightContent />
          </StudioPageHeader.Right>
        </StudioPageHeader.Main>
      </StudioPageHeader>
    </div>
  );
};

export const CenterContent = (): ReactElement => {
  const { t } = useTranslation();
  const { org } = useParams();
  const adminEnabled = useFeatureFlag(FeatureFlag.Admin);

  return (
    <StudioPageHeader.Center>
      <StudioPageHeader.HeaderLink
        renderLink={(props) => (
          <a href={org ? `/dashboard/app-dashboard/${org}` : '/dashboard'} {...props}>
            <span>{t('dashboard.header_item_dashboard')}</span>
          </a>
        )}
      />
      {adminEnabled && (
        <StudioPageHeader.HeaderLink
          renderLink={(props) => (
            <NavLink data-color='dark' to={org ? `/${org}/apps` : '/'} {...props}>
              <span className={classes.active}>{t('admin.apps.title')}</span>
            </NavLink>
          )}
        />
      )}
      <StudioPageHeader.HeaderLink
        isBeta={true}
        renderLink={(props) => (
          <a href={`/dashboard/org-library/${org ?? 'self'}`} {...props}>
            <span>{t('dashboard.header_item_library')}</span>
          </a>
        )}
      />
    </StudioPageHeader.Center>
  );
};

const RightContent = (): ReactElement => {
  const { org } = useParams();
  const navigate = useNavigate();
  const orgMatch = useMatch('/:org/*');
  const subPath = orgMatch?.params['*'] || RoutePaths.Apps;

  return (
    <ProfileMenu
      currentUserOrg={org}
      onOrgClick={(organization) => navigate(`/${organization.username}/${subPath}`)}
      onUserClick={() => navigate('/')}
    />
  );
};
