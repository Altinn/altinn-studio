import React, { useEffect, useState } from 'react';
import classes from './VersionControlButtons.module.css';
import { ShareChangesButton } from './ShareChangesButton';
import { SyncModal } from './SyncModal';
import type { IContentStatus, IGitStatus } from 'app-shared/types/global';
import { useTranslation } from 'react-i18next';
import {
  useRepoMetadataQuery,
  useRepoPullQuery,
  useRepoStatusQuery,
} from 'app-shared/hooks/queries';
import { useRepoCommitAndPushMutation } from 'app-shared/hooks/mutations';
import { toast } from 'react-toastify';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { FetchChanges } from './FetchChangesButton/FetchChangesButton';

const initialModalState = {
  header: '',
  descriptionText: [] as string[],
  isLoading: false,
  shouldShowDoneIcon: false,
  btnText: '',
  shouldShowCommitBox: false,
  btnMethod: (_x: string) => undefined,
};

function hasLocalChanges(result: IGitStatus) {
  return (
    result && result.contentStatus.some((file: IContentStatus) => file.fileStatus !== 'Ignored')
  );
}

export const VersionControlButtons = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const [hasPushRights, setHasPushRights] = useState(false);
  const [hasMergeConflict, setHasMergeConflict] = useState(false);
  const [modalState, setModalState] = useState(initialModalState);
  const [syncModalAnchorEl, setSyncModalAnchorEl] = useState(null);

  const { data: currentRepo } = useRepoMetadataQuery(org, app);
  const { data: repoStatus, refetch: refetchRepoStatus } = useRepoStatusQuery(org, app);
  const { refetch: fetchPullData } = useRepoPullQuery(org, app, true);
  const { mutateAsync: repoCommitAndPushMutation } = useRepoCommitAndPushMutation(org, app);

  useEffect(() => {
    if (currentRepo) {
      setHasPushRights(currentRepo.permissions.push);
    }
  }, [hasPushRights, currentRepo]);
  useEffect(() => {
    if (repoStatus) {
      setHasMergeConflict(repoStatus.hasMergeConflict);
    }
  }, [repoStatus]);

  const handleSyncModalClose = () => {
    setSyncModalAnchorEl(null);
    setModalState(initialModalState);
  };

  const shareChanges = async (currentTarget: any) => {
    setSyncModalAnchorEl(currentTarget);
    setModalState({
      ...initialModalState,
      header: t('sync_header.controlling_service_status'),
      isLoading: true,
    });
    const { data: repoStatusResult } = await refetchRepoStatus();
    if (repoStatusResult) {
      if (!hasLocalChanges(repoStatusResult) && repoStatusResult.aheadBy === 0) {
        // if user has nothing to commit => show nothing to push message
        setModalState({
          ...initialModalState,
          shouldShowDoneIcon: true,
          header: t('sync_header.nothing_to_push'),
        });
      } else {
        // if user has changes to share, show write commit message modal
        setModalState({
          ...initialModalState,
          header: t('sync_header.describe_and_validate'),
          descriptionText: [
            t('sync_header.describe_and_validate_sub_message'),
            t('sync_header.describe_and_validate_sub_sub_message'),
          ],
          btnText: t('sync_header.describe_and_validate_btnText'),
          shouldShowCommitBox: true,
          btnMethod: commitAndPushChanges,
        });
      }
    }
  };

  const commitAndPushChanges = async (commitMessage: string) => {
    setModalState({
      ...initialModalState,
      header: t('sync_header.sharing_changes'),
      isLoading: true,
    });
    try {
      await repoCommitAndPushMutation({ commitMessage });
    } catch (error) {
      console.error(error);
      const { data: result } = await fetchPullData();
      if (result.hasMergeConflict || result.repositoryStatus === 'CheckoutConflict') {
        // if pull resulted in a merge conflict, show merge conflict message
        forceRepoStatusCheck();
        handleSyncModalClose();
        setHasMergeConflict(true);
      }
      return;
    }

    const { data: result } = await fetchPullData();
    if (result.repositoryStatus === 'Ok') {
      setModalState(initialModalState);
      setSyncModalAnchorEl(null);
      toast.success(t('sync_header.sharing_changes_completed'));
    }
  };

  const forceRepoStatusCheck = () =>
    window.postMessage('forceRepoStatusCheck', window.location.href);

  return (
    <div className={classes.headerStyling}>
      <FetchChanges
        hasMergeConflict={hasMergeConflict}
        displayNotification={repoStatus?.behindBy > 0 ?? false}
        numChanges={repoStatus?.behindBy ?? 0}
        handleMergeConflict={() => commitAndPushChanges('')}
      />
      <ShareChangesButton
        hasMergeConflict={hasMergeConflict}
        hasPushRight={hasPushRights}
        shareChanges={shareChanges}
        displayNotification={repoStatus?.contentStatus?.length > 0 ?? false}
      />
      <SyncModal anchorEl={syncModalAnchorEl} handleClose={handleSyncModalClose} {...modalState} />
    </div>
  );
};
