import React, { type ReactElement } from 'react';
import classes from './SubHeader.module.css';
import { getRepositoryType } from 'app-shared/utils/repository';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';
import { SettingsModalButton } from './SettingsModalButton';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { RepositoryType } from 'app-shared/types/global';
import { useSelectedFormLayoutSetName, useSelectedFormLayoutName } from '@altinn/ux-editor/hooks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import { StudioPageHeaderButton, useMediaQuery } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { PlayFillIcon } from '@studio/icons';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';

type SubHeaderProps = {
  hasRepoError?: boolean;
};

export const SubHeader = ({ hasRepoError }: SubHeaderProps): ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const repositoryType = getRepositoryType(org, app);
  const { doReloadPreview } = usePreviewContext();

  return (
    <GiteaHeader
      hasCloneModal
      leftComponent={repositoryType !== RepositoryType.DataModels && <SubHeaderLeftContent />}
      hasRepoError={hasRepoError}
      onPullSuccess={doReloadPreview}
    />
  );
};

const SubHeaderLeftContent = () => {
  return (
    <div className={classes.buttonWrapper}>
      <SettingsModalButton />
      <PreviewButton />
    </div>
  );
};

const PreviewButton = () => {
  const { t } = useTranslation();
  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useSelectedFormLayoutSetName();
  const { selectedFormLayoutName } = useSelectedFormLayoutName(selectedFormLayoutSetName);
  const packagesRouter = new PackagesRouter({ org, app });
  const previewLink: string = `${packagesRouter.getPackageNavigationUrl('preview')}${selectedFormLayoutName ? `?layout=${selectedFormLayoutName}` : ''}`;

  return (
    <StudioPageHeaderButton asChild color='dark'>
      <a href={previewLink} className={classes.previewLink}>
        <PlayFillIcon className={classes.playIcon} />
        {shouldDisplayText && t('top_menu.preview')}
      </a>
    </StudioPageHeaderButton>
  );
};
