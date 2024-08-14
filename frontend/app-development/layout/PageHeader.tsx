import React, { type ReactElement } from 'react';
import { getTopBarMenuItems } from './AppBar/appBarConfig';
import { getRepositoryType } from 'app-shared/utils/repository';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';
import { SettingsModalButton } from './SettingsModalButton';
import type { User } from 'app-shared/types/Repository';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { RepositoryType } from 'app-shared/types/global';
import { useSelectedFormLayoutSetName, useSelectedFormLayoutName } from '@altinn/ux-editor/hooks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import { StudioPageHeader, StudioPageHeaderButton, useIsSmallWidth } from '@studio/components';
import { useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { AltinnHeaderMenu } from 'app-shared/components/altinnHeaderMenu';
import { AppUserProfileMenu } from 'app-shared/components/AppUserProfileMenu';
import { useTranslation } from 'react-i18next';
import { PlayFillIcon } from '@studio/icons';

// TODO
const WINDOW_RESIZE_WIDTH = 900;

type SubMenuContentProps = {
  hasRepoError?: boolean;
};

// TODO MOVE
export const SubMenuContent = ({ hasRepoError }: SubMenuContentProps): ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const repositoryType = getRepositoryType(org, app);
  const { doReloadPreview } = usePreviewContext();

  return (
    <GiteaHeader
      hasCloneModal
      leftComponent={repositoryType !== RepositoryType.DataModels && <LeftComponent />}
      hasRepoError={hasRepoError}
      onPullSuccess={doReloadPreview}
    />
  );
};

// TODO MOVE
const LeftComponent = () => {
  const { t } = useTranslation();
  const isSmallWidth = useIsSmallWidth(WINDOW_RESIZE_WIDTH);

  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useSelectedFormLayoutSetName();
  const { selectedFormLayoutName } = useSelectedFormLayoutName(selectedFormLayoutSetName);

  const packagesRouter = new PackagesRouter({ org, app });
  const previewLink: string = `${packagesRouter.getPackageNavigationUrl('preview')}${selectedFormLayoutName ? `?layout=${selectedFormLayoutName}` : ''}`;

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.5rem',
      }}
    >
      <SettingsModalButton />
      <StudioPageHeaderButton variant='regular' color='dark' asChild>
        <a
          href={previewLink}
          style={{
            display: 'flex',
            gap: '0.25rem',
          }}
        >
          <PlayFillIcon
            style={{
              fontSize: '1.25rem',
            }}
          />
          {!isSmallWidth && t('top_menu.preview')}
        </a>
      </StudioPageHeaderButton>
    </div>
  );
};

type PageHeaderProps = {
  showSubMenu: boolean;
  user: User;
  repoOwnerIsOrg: boolean;
  isRepoError?: boolean;
};

export const PageHeader = ({ showSubMenu, user, repoOwnerIsOrg, isRepoError }: PageHeaderProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const repoType = getRepositoryType(org, app);
  const { data: repository } = useRepoMetadataQuery(org, app);

  const menuItems = getTopBarMenuItems(repoType, repoOwnerIsOrg);

  const isSmallWidth = useIsSmallWidth(WINDOW_RESIZE_WIDTH);

  return (
    <StudioPageHeader>
      <StudioPageHeader.Main>
        <StudioPageHeader.Left title={!isSmallWidth && app} variant='regular' />
        <StudioPageHeader.Center>
          {menuItems && (
            <AltinnHeaderMenu menuItems={menuItems} windowResizeWidth={WINDOW_RESIZE_WIDTH} />
          )}
        </StudioPageHeader.Center>
        <StudioPageHeader.Right>
          <AppUserProfileMenu user={user} repository={repository} variant='regular' />
        </StudioPageHeader.Right>
      </StudioPageHeader.Main>
      {(showSubMenu || !isRepoError) && (
        <StudioPageHeader.Sub>
          <SubMenuContent hasRepoError={isRepoError} />
        </StudioPageHeader.Sub>
      )}
    </StudioPageHeader>
  );
};
