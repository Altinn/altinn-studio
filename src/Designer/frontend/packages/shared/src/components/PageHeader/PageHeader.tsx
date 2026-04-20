import type { ReactElement } from 'react';
import { useMatch, useNavigate, useParams } from 'react-router-dom';
import { StudioLink, StudioPageHeader } from '@studio/components';
import { useTranslation } from 'react-i18next';
import {
  ADMIN_BASENAME,
  APP_DASHBOARD_BASENAME,
  DASHBOARD_BASENAME,
  DISPLAY_NAME,
  MEDIA_QUERY_MAX_WIDTH,
  ORG_LIBRARY_BASENAME,
} from 'app-shared/constants';
import { useMediaQuery } from '@studio/hooks';
import { FeatureFlag, useFeatureFlag } from '@studio/feature-flags';
import { ProfileMenu } from 'app-shared/components';
import classes from './PageHeader.module.css';

type PageHeaderProps = {
  owner: string;
  orgRoutePaths?: string[];
  userRoutePaths?: string[];
};

export const PageHeader = ({
  owner,
  orgRoutePaths,
  userRoutePaths,
}: PageHeaderProps): ReactElement => {
  const shouldDisplayDesktopMenu = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);

  return (
    <div data-color-scheme='dark'>
      <StudioPageHeader>
        <StudioPageHeader.Main>
          <StudioPageHeader.Left showTitle={shouldDisplayDesktopMenu} title={DISPLAY_NAME} />
          {shouldDisplayDesktopMenu && <CenterContent owner={owner} />}
          <StudioPageHeader.Right>
            <RightContent orgRoutePaths={orgRoutePaths} userRoutePaths={userRoutePaths} />
          </StudioPageHeader.Right>
        </StudioPageHeader.Main>
      </StudioPageHeader>
    </div>
  );
};

type CenterContentProps = {
  owner: string;
};

const CenterContent = ({ owner }: CenterContentProps): ReactElement => {
  const { t } = useTranslation();
  const adminEnabled = useFeatureFlag(FeatureFlag.Admin);
  const isAdminPath = window.location.pathname.startsWith(ADMIN_BASENAME);

  return (
    <StudioPageHeader.Center>
      <StudioPageHeader.HeaderLink
        renderLink={(props) => (
          <StudioLink href={`${DASHBOARD_BASENAME}/${APP_DASHBOARD_BASENAME}/${owner}`} {...props}>
            <span>{t('dashboard.header_item_dashboard')}</span>
          </StudioLink>
        )}
      />
      {adminEnabled && (
        <StudioPageHeader.HeaderLink
          renderLink={(props) => (
            <StudioLink href={`${ADMIN_BASENAME}/${owner}`} {...props}>
              <span className={isAdminPath ? classes.active : undefined}>
                {t('admin.apps.title')}
              </span>
            </StudioLink>
          )}
        />
      )}
      <StudioPageHeader.HeaderLink
        isBeta={true}
        renderLink={(props) => (
          <StudioLink href={`${DASHBOARD_BASENAME}/${ORG_LIBRARY_BASENAME}/${owner}`} {...props}>
            <span>{t('dashboard.header_item_library')}</span>
          </StudioLink>
        )}
      />
    </StudioPageHeader.Center>
  );
};

type RightContentProps = {
  orgRoutePaths: string[];
  userRoutePaths: string[];
};

const RightContent = ({ orgRoutePaths, userRoutePaths }: RightContentProps): ReactElement => {
  const { owner } = useParams();
  const navigate = useNavigate();
  const ownerMatch = useMatch('/:owner/*');
  const subPath = ownerMatch?.params['*'] || '';

  const buildPath = (username: string, validSubPages?: string[]) => {
    const page = !validSubPages || validSubPages.includes(subPath) ? subPath : '';
    return page ? `/${username}/${page}` : `/${username}`;
  };

  return (
    <ProfileMenu
      currentUserOrg={owner}
      onOrgClick={(org) => navigate(buildPath(org.username, orgRoutePaths))}
      onUserClick={(user) => user && navigate(buildPath(user.login, userRoutePaths))}
    />
  );
};
