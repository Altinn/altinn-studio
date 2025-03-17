import React, { type ReactElement } from 'react';
import classes from './SubHeader.module.css';
import { getRepositoryType } from 'app-shared/utils/repository';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';
import { SettingsModalButton } from './SettingsModalButton';
import { RepositoryType } from 'app-shared/types/global';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import { PreviewButton } from './PreviewButton';

export type SubHeaderProps = {
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
      owner={org}
      repoName={app}
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
