import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import classes from './GiteaHeader.module.css';
import { VersionControlButtons } from './VersionControlButtons';
import { ThreeDotsMenu } from './ThreeDotsMenu';
import { GiteaHeaderContext } from './context/GiteaHeaderContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppValidationQuery } from 'app-development/hooks/queries/useAppValidationQuery';
import { StudioButton, StudioDialog } from '@studio/components';
import { CheckmarkCircleFillIcon, SectionHeaderWarningIcon } from '@studio/icons';
import { AppValidationDialog } from '../AppValidationDialog/AppValidationDialog';

type GiteaHeaderProps = {
  menuOnlyHasRepository?: boolean;
  hasCloneModal?: boolean;
  rightContentClassName?: string;
  leftComponent?: ReactNode;
  hasRepoError?: boolean;
  onPullSuccess?: () => void;
  owner: string;
  repoName: string;
};

export const GiteaHeader = ({
  menuOnlyHasRepository = false,
  hasCloneModal = false,
  rightContentClassName,
  leftComponent,
  hasRepoError,
  onPullSuccess,
  owner,
  repoName,
}: GiteaHeaderProps): ReactElement => {
  return (
    <GiteaHeaderContext.Provider value={{ owner, repoName }}>
      <div className={classes.wrapper}>
        <div className={classes.leftContentWrapper}>{leftComponent}</div>
        <div className={`${classes.rightContentWrapper} ${rightContentClassName}`}>
          <ProblemStatusIndicator />
          {!hasRepoError && <VersionControlButtons onPullSuccess={onPullSuccess} />}
          <ThreeDotsMenu isClonePossible={!menuOnlyHasRepository && hasCloneModal} />
        </div>
      </div>
    </GiteaHeaderContext.Provider>
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
      <StudioDialog.Trigger variant='tertiary' icon=<SectionHeaderWarningIcon />>
        {members.length}
      </StudioDialog.Trigger>
      <AppValidationDialog />
    </StudioDialog.TriggerContext>
  );
};
