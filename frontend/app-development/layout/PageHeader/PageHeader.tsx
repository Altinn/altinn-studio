import React, { type ReactElement } from 'react';
import { getTopBarMenuItems } from 'app-development/utils/headerMenu/headerMenuUtils';
import { getRepositoryType } from 'app-shared/utils/repository';
import type { User } from 'app-shared/types/Repository';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioPageHeader, useMediaQuery } from '@studio/components';
import { useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { HeaderMenu } from './HeaderMenu';
import { AppUserProfileMenu } from 'app-shared/components/AppUserProfileMenu';
import { WINDOW_RESIZE_WIDTH } from 'app-shared/utils/resizeUtils';
import { SubHeader } from './SubHeader';

type PageHeaderProps = {
  showSubMenu: boolean;
  user: User;
  repoOwnerIsOrg: boolean;
  isRepoError?: boolean;
};

export const PageHeader = ({
  showSubMenu,
  user,
  repoOwnerIsOrg,
  isRepoError,
}: PageHeaderProps): ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const repoType = getRepositoryType(org, app);
  const { data: repository } = useRepoMetadataQuery(org, app);

  // TODO - Maybe this should be moved to a 'headerContext'?
  const shouldResizeWindow = useMediaQuery(`(max-width: ${WINDOW_RESIZE_WIDTH}px)`);

  const menuItems = getTopBarMenuItems(repoType, repoOwnerIsOrg);

  return (
    <StudioPageHeader>
      <StudioPageHeader.Main>
        <StudioPageHeader.Left title={!shouldResizeWindow && app} />
        <StudioPageHeader.Center>
          {menuItems && <HeaderMenu menuItems={menuItems} shouldResize={shouldResizeWindow} />}
        </StudioPageHeader.Center>
        <StudioPageHeader.Right>
          <AppUserProfileMenu user={user} repository={repository} color='dark' />
        </StudioPageHeader.Right>
      </StudioPageHeader.Main>
      {(showSubMenu || !isRepoError) && (
        <StudioPageHeader.Sub>
          <SubHeader hasRepoError={isRepoError} />
        </StudioPageHeader.Sub>
      )}
    </StudioPageHeader>
  );
};
