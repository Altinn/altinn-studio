import React, { type ReactElement } from 'react';
import classes from './SubHeader.module.css';
import { getRepositoryType } from 'app-shared/utils/repository';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';
import { SettingsPageButton } from './SettingsPageButton';
import { RepositoryType } from 'app-shared/types/global';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { usePreviewContext } from '../../../contexts/PreviewContext';
import { PreviewButton } from './PreviewButton';
import { usePageHeaderContext } from '../../../contexts/PageHeaderContext';
import { StudioButton } from '@studio/components-legacy';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';

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
      leftComponent={<LeftContent repositoryType={repositoryType} />}
      hasRepoError={hasRepoError}
      onPullSuccess={doReloadPreview}
      owner={org}
      repoName={app}
    />
  );
};

export type LeftContentProps = {
  repositoryType: RepositoryType;
};

export const LeftContent = ({ repositoryType }: LeftContentProps) => {
  const { returnTo } = usePageHeaderContext();
  const { t } = useTranslation();
  const navigate = useNavigate();
  if (repositoryType === RepositoryType.DataModels) {
    return null;
  }

  if (returnTo) {
    return (
      <StudioButton
        onClick={() => navigate(returnTo)}
        variant='tertiary'
        color='inverted'
        icon={<ArrowLeftIcon />}
      >
        {t(`header.returnTo.${returnTo}`)}
      </StudioButton>
    );
  }
  return <SubHeaderLeftContent />;
};

const SubHeaderLeftContent = () => {
  return (
    <div className={classes.buttonWrapper}>
      <SettingsPageButton />
      <PreviewButton />
    </div>
  );
};
