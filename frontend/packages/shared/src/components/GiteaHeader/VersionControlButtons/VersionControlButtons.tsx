import React from 'react';
import classes from './VersionControlButtons.module.css';
import { useRepoMetadataQuery, useRepoStatusQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { FetchChanges } from './FetchChangesButton/FetchChangesButton';
import { ShareChanges } from './ShareChangesButton/ShareChangesButton';
import { VersionControlButtonsContextProvider, useVersionControlButtonsContext } from './context';

export const VersionControlButtons = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: currentRepo } = useRepoMetadataQuery(org, app);
  const { data: repoStatus } = useRepoStatusQuery(org, app);

  return (
    <VersionControlButtonsContextProvider currentRepo={currentRepo} repoStatus={repoStatus}>
      <VersionControlButtonsContent />
    </VersionControlButtonsContextProvider>
  );
};

const VersionControlButtonsContent = () => {
  const { repoStatus } = useVersionControlButtonsContext();

  return (
    <div className={classes.headerStyling}>
      <FetchChanges
        displayNotification={repoStatus?.behindBy > 0 ?? false}
        numChanges={repoStatus?.behindBy ?? 0}
      />
      <ShareChanges displayNotification={repoStatus?.contentStatus?.length > 0 ?? false} />
    </div>
  );
};
