import React from 'react';
import classes from './VersionControlButtons.module.css';
import { useRepoMetadataQuery, useRepoStatusQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { FetchChangesPopover } from './components/FetchChangesPopover';
import { ShareChangesPopover } from './components/ShareChangesPopover';
import { VersionControlButtonsContextProvider } from './context';

export const VersionControlButtons = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: currentRepo } = useRepoMetadataQuery(org, app);
  const { data: repoStatus } = useRepoStatusQuery(org, app);

  return (
    <VersionControlButtonsContextProvider currentRepo={currentRepo} repoStatus={repoStatus}>
      <div className={classes.headerStyling}>
        <FetchChangesPopover />
        <ShareChangesPopover />
      </div>
    </VersionControlButtonsContextProvider>
  );
};
