import React, { useState } from 'react';
import classes from './VersionControlButtons.module.css';
import { SyncModal } from './SyncModal';
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

const initialModalState = {
  header: '',
  descriptionText: [] as string[],
  isLoading: false,
  shouldShowDoneIcon: false,
  btnText: '',
  shouldShowCommitBox: false,
  btnMethod: (_x: string) => undefined,
};

const VersionControlButtonsContent = () => {
  const [modalState, setModalState] = useState(initialModalState);
  const [syncModalAnchorEl, setSyncModalAnchorEl] = useState(null);

  const { repoStatus } = useVersionControlButtonsContext();

  const handleSyncModalClose = () => {
    setSyncModalAnchorEl(null);
    setModalState(initialModalState);
  };

  return (
    <div className={classes.headerStyling}>
      <FetchChanges
        displayNotification={repoStatus?.behindBy > 0 ?? false}
        numChanges={repoStatus?.behindBy ?? 0}
      />
      <ShareChanges displayNotification={repoStatus?.contentStatus?.length > 0 ?? false} />
      {/*<ShareChangesButton
        hasMergeConflict={hasMergeConflict}
        hasPushRight={hasPushRights}
        shareChanges={shareChanges}
        displayNotification={repoStatus?.contentStatus?.length > 0 ?? false}
      />*/}
      <SyncModal anchorEl={syncModalAnchorEl} handleClose={handleSyncModalClose} {...modalState} />
    </div>
  );
};
