import React, { type ReactElement } from 'react';
import classes from './SubHeader.module.css';
import { getRepositoryType } from 'app-shared/utils/repository';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';
import { SettingsPageButton } from './SettingsPageButton';
import { RepositoryType } from 'app-shared/types/global';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import { PreviewButton } from './PreviewButton';
import { usePageHeaderContext } from 'app-development/contexts/PageHeaderContext';
import { StudioButton, StudioDialog } from '@studio/components';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CheckmarkCircleFillIcon, SectionHeaderWarningIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { FeatureFlag, useFeatureFlag } from '@studio/feature-flags';
import { useAppValidationQuery } from 'app-development/hooks/queries/useAppValidationQuery';
import { AppValidationDialog } from 'app-shared/components/AppValidationDialog/AppValidationDialog';

export type SubHeaderProps = {
  hasRepoError?: boolean;
};

export const SubHeader = ({ hasRepoError }: SubHeaderProps): ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const repositoryType = getRepositoryType(org, app);
  const { doReloadPreview } = usePreviewContext();
  const appMetadataFlag = useFeatureFlag(FeatureFlag.AppMetadata);

  return (
    <GiteaHeader
      hasCloneModal
      leftComponent={<LeftContent repositoryType={repositoryType} />}
      rightContent={appMetadataFlag && <ProblemStatusIndicator />}
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
        data-color='neutral'
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

const ProblemStatusIndicator = () => {
  const { org, app } = useStudioEnvironmentParams();
  const {
    data: validationResult,
    refetch: refetchValidation,
    isFetching: validationPending,
  } = useAppValidationQuery(org, app);

  const revalidate = () => {
    refetchValidation();
  };

  if (validationPending) {
    return <StudioButton variant='tertiary' loading></StudioButton>;
  }
  if (!validationResult?.errors) {
    return (
      <StudioButton
        variant='tertiary'
        icon={<CheckmarkCircleFillIcon />}
        onClick={revalidate}
      ></StudioButton>
    );
  }

  const members = validationResult ? Object.entries(validationResult.errors) : [];
  return (
    <StudioDialog.TriggerContext>
      <StudioDialog.Trigger variant='tertiary' icon={<SectionHeaderWarningIcon />}>
        {members.length}
      </StudioDialog.Trigger>
      <AppValidationDialog />
    </StudioDialog.TriggerContext>
  );
};
