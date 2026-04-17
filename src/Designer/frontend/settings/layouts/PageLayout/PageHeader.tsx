import type { ReactElement } from 'react';
import { useMatch, useNavigate, useParams } from 'react-router-dom';
import { StudioPageHeader } from '@studio/components';
import { useTranslation } from 'react-i18next';
import './PageLayout.css';
import { DISPLAY_NAME, MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { useMediaQuery } from '@studio/hooks';
import { FeatureFlag, useFeatureFlag } from '@studio/feature-flags';
import { ProfileMenu } from 'app-shared/components';
import { useUserQuery } from 'app-shared/hooks/queries';
import { RoutePaths as OrgRoutePaths } from '../../features/orgs/routes/RoutePaths';
import { RoutePaths as UserRoutePaths } from '../../features/user/routes/RoutePaths';

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

const CenterContent = (): ReactElement => {
  const { t } = useTranslation();
  const ownerMatch = useMatch('/:owner/*');
  const owner = ownerMatch?.params.owner ?? null;
  const { data: user } = useUserQuery();
  const dashboardContext = owner && owner !== user?.login ? owner : 'self';
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

const RightContent = (): ReactElement => {
  const navigate = useNavigate();
  const ownerMatch = useMatch('/:owner/*');
  const subPath = ownerMatch?.params['*'] || '';
  const { owner } = useParams();

  const orgSubPages = Object.values(OrgRoutePaths);
  const userSubPages = Object.values(UserRoutePaths);

  const buildPath = (username: string, validSubPages: string[]) => {
    const page = validSubPages.includes(subPath) ? subPath : '';
    return page ? `/${username}/${page}` : `/${username}`;
  };

  return (
    <ProfileMenu
      currentUserOrg={owner}
      onOrgClick={(org) => navigate(buildPath(org.username, orgSubPages))}
      onUserClick={(user) => user && navigate(buildPath(user.login, userSubPages))}
    />
  );
};
