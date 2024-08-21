import React, { type ReactElement } from 'react';
import { getTopBarMenuItems } from 'app-development/utils/headerMenu/headerMenuUtils';
import { getRepositoryType } from 'app-shared/utils/repository';
import type { User } from 'app-shared/types/Repository';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioPageHeader, useMediaQuery } from '@studio/components';
import { useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { HeaderMenu } from './HeaderMenu';
import { AppUserProfileMenu } from 'app-shared/components/AppUserProfileMenu';
import { SubHeader } from './SubHeader';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';

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

  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);

  const menuItems = getTopBarMenuItems(repoType, repoOwnerIsOrg);

  // TODO - FIX NEW STRUCTURE - IF SMALL, Nothing in main, merge small nav and profile in right
  return (
    <StudioPageHeader>
      <StudioPageHeader.Main>
        <StudioPageHeader.Left title={shouldDisplayText && app} />
        <StudioPageHeader.Center>
          {menuItems && <HeaderMenu menuItems={menuItems} />}
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

/*
Men hva med disse 3 gruppene da?
  - Oversikt
  - Verktøy
    - Lage
    - Datamodell
    - Språk
    - Prosess (beta)
  - Brukernavn for org
    - Dokumentasjon
    - Logg ut

da er "brukernacn for org" samme tekst som står der til vanlig

Supert! så har vi jo de casene hvor brukernavnet for org blir veldig langt :slightly_smiling_face:
så kanskje begrense mkas ord der, også vise hele navnet når man hovrer over, slik som vi gjorde med lange id navn?
*/
