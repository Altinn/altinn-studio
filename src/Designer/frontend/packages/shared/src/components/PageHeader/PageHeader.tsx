import type { ReactElement } from 'react';
import { useLocation } from 'react-router-dom';
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
import type { Organization } from 'app-shared/types/Organization';
import type { User } from 'app-shared/types/Repository';
import classes from './PageHeader.module.css';

type PageHeaderProps = {
  owner: string;
  onOrgSelect: (org: Organization) => void;
  onUserSelect: (user: User) => void;
};

export const PageHeader = ({ owner, onOrgSelect, onUserSelect }: PageHeaderProps): ReactElement => {
  const shouldDisplayDesktopMenu = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);

  return (
    <div data-color-scheme='dark'>
      <StudioPageHeader>
        <StudioPageHeader.Main>
          <StudioPageHeader.Left showTitle={shouldDisplayDesktopMenu} title={DISPLAY_NAME} />
          {shouldDisplayDesktopMenu && <CenterContent owner={owner} />}
          <StudioPageHeader.Right>
            <ProfileMenu
              currentUserOrg={owner}
              onOrgSelect={onOrgSelect}
              onUserSelect={onUserSelect}
            />
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
  const { pathname } = useLocation();
  const adminEnabled = useFeatureFlag(FeatureFlag.Admin);
  const isAdminPath = pathname === ADMIN_BASENAME || pathname.startsWith(`${ADMIN_BASENAME}/`);

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
