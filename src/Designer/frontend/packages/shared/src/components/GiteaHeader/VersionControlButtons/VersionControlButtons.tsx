import React from 'react';
import classes from './VersionControlButtons.module.css';
import { useRepoMetadataQuery, useRepoStatusQuery } from 'app-shared/hooks/queries';
import { FetchChangesPopover } from './components/FetchChangesPopover';
import { ShareChangesPopover } from './components/ShareChangesPopover';
import { VersionControlButtonsContextProvider } from './context';
import { useGiteaHeaderContext } from '../context/GiteaHeaderContext';

export type VersionControlButtonsProps = {
  onPullSuccess: () => void;
};

export const VersionControlButtons = ({
  onPullSuccess,
}: VersionControlButtonsProps): React.ReactElement => {
  const { owner, repoName } = useGiteaHeaderContext();
  const { data: currentRepo } = useRepoMetadataQuery(owner, repoName);
  const { data: repoStatus } = useRepoStatusQuery(owner, repoName);

  return (
    <VersionControlButtonsContextProvider
      currentRepo={currentRepo}
      repoStatus={repoStatus}
      onPullSuccess={onPullSuccess}
    >
      <div className={classes.headerStyling}>
        <FetchChangesPopover />
        <ShareChangesPopover />
      </div>
    </VersionControlButtonsContextProvider>
  );
};
