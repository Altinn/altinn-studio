import React, { useEffect, useState } from 'react';
import classes from './VersionControlButtons.module.css';
import { FetchChangesButton } from './FetchChangesButton';
import { ShareChangesButton } from './ShareChangesButton';
import { SyncModal } from './SyncModal';
import type { IContentStatus, IGitStatus } from 'app-shared/types/global';
import { useTranslation } from 'react-i18next';
import {
  useRepoMetadataQuery,
  useRepoPullQuery,
  useRepoStatusQuery,
} from 'app-shared/hooks/queries';
import { useQueryClient } from '@tanstack/react-query';
import { useRepoCommitAndPushMutation } from 'app-shared/hooks/mutations';
import * as testids from '../../../../../../testing/testids';

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

export interface IVersionControlButtonsProps {
  hasPushRight?: boolean;
  org: string;
  app: string;
}

export const VersionControlButtons = ({ hasPushRight, org, app }: IVersionControlButtonsProps) => {
  const { t } = useTranslation();
  const [hasPushRights, setHasPushRights] = useState(hasPushRight);
  const [hasMergeConflict, setHasMergeConflict] = useState(false);
  const [hasChangesInLocalRepo, setHasChangesInLocalRepo] = useState(false);
  const [modalState, setModalState] = useState(initialModalState);
  const [syncModalAnchorEl, setSyncModalAnchorEl] = useState(null);

  const { data: currentRepo } = useRepoMetadataQuery(org, app);
  const { data: repoStatus, refetch: refetchRepoStatus } = useRepoStatusQuery(org, app);
  const { refetch: fetchPullData } = useRepoPullQuery(org, app, true);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (hasPushRights === undefined && currentRepo) {
      setHasPushRights(currentRepo.permissions.push);
    }
  }, [hasPushRights, currentRepo]);
  useEffect(() => {
    if (repoStatus) {
      setHasMergeConflict(repoStatus.repositoryStatus === 'MergeConflict');
      setHasChangesInLocalRepo(hasLocalChanges(repoStatus));
    }
  }, [repoStatus]);

  const handleSyncModalClose = () => {
    if (!(repoStatus?.repositoryStatus === 'MergeConflict')) {
      setSyncModalAnchorEl(null);
      setModalState(initialModalState);
    }
  };

  const fetchChanges = async (currentTarget: any) => {
    setSyncModalAnchorEl(currentTarget);
    setModalState({
      ...initialModalState,
      header: t('sync_header.fetching_latest_version'),
      isLoading: true,
    });
    const { data: result } = await fetchPullData();
    if (result.repositoryStatus === 'Ok') {
      // if pull was successfull, show app is updated message
      setModalState({
        ...initialModalState,
        header: t('sync_header.service_updated_to_latest'),
        isLoading: false,
        shouldShowDoneIcon: true,
      });
      // force refetch  files
      await queryClient.invalidateQueries(); // Todo: This invalidates ALL queries. Consider providing a list of relevant queries only.
      forceRepoStatusCheck();
    } else if (result.repositoryStatus === 'CheckoutConflict') {
      // if pull gives merge conflict, show user needs to commit message
      setModalState({
        ...initialModalState,
        header: t('sync_header.changes_made_samme_place_as_user'),
        descriptionText: [
          t('sync_header.changes_made_samme_place_submessage'),
          t('sync_header.changes_made_samme_place_subsubmessage'),
        ],
        btnText: t('sync_header.fetch_changes_btn'),
        shouldShowCommitBox: true,
        btnMethod: commitAndPushChanges,
      });
    }
  };

  const shareChanges = async (currentTarget: any) => {
    setSyncModalAnchorEl(currentTarget);
    setModalState({
      ...initialModalState,
      isLoading: true,
    });
    const { data: repoStatusResult } = await refetchRepoStatus();
    if (!hasLocalChanges(repoStatusResult)) {
      setModalState({
        ...initialModalState,
        shouldShowDoneIcon: true,
        header: t('sync_header.nothing_to_push'),
      });
    }
    if (hasPushRights) {
      setModalState({
        ...initialModalState,
        header: t('sync_header.controlling_service_status'),
        isLoading: true,
      });

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
              t('sync_header.describe_and_validate_submessage'),
              t('sync_header.describe_and_validate_subsubmessage'),
            ],
            btnText: t('sync_header.describe_and_validate_btnText'),
            shouldShowCommitBox: true,
            isLoading: false,
            btnMethod: commitAndPushChanges,
          });
        }
      }
    } else {
      // if user don't have push rights, show modal stating no access to share changes
      setModalState({
        ...initialModalState,
        header: t('sync_header.sharing_changes_no_access'),
        descriptionText: [t('sync_header.sharing_changes_no_access_submessage')],
      });
    }
  };

  const repoCommitAndPushMutation = useRepoCommitAndPushMutation(org, app);
  const commitAndPushChanges = async (commitMessage: string) => {
    setModalState({
      ...initialModalState,
      header: t('sync_header.sharing_changes'),
      isLoading: true,
    });
    try {
      await repoCommitAndPushMutation.mutateAsync({ commitMessage });
    } catch (error) {
      console.error(error);
      const { data: result } = await fetchPullData();
      if (result.repositoryStatus === 'CheckoutConflict') {
        // if pull resulted in a mergeconflict, show mergeconflict message
        setModalState({
          ...initialModalState,
          header: t('sync_header.merge_conflict_occured'),
          descriptionText: [t('sync_header.merge_conflict_occured_submessage')],
          btnText: t('sync_header.merge_conflict_btn'),
          btnMethod: forceRepoStatusCheck,
        });
        setHasMergeConflict(true);
      } else {
        handleSyncModalClose();
      }
      return;
    }

    const { data: result } = await fetchPullData();
    if (result.repositoryStatus === 'Ok') {
      setModalState({
        ...initialModalState,
        header: t('sync_header.sharing_changes_completed'),
        descriptionText: [t('sync_header.sharing_changes_completed_submessage')],
        shouldShowDoneIcon: true,
      });
    } else if (
      result.repositoryStatus === 'MergeConflict' ||
      result.repositoryStatus === 'CheckoutConflict'
    ) {
      // if pull resulted in a mergeconflict, show mergeconflict message
      setModalState({
        ...initialModalState,
        header: t('sync_header.merge_conflict_occured'),
        descriptionText: [t('sync_header.merge_conflict_occured_submessage')],
        btnText: t('sync_header.merge_conflict_btn'),
        btnMethod: forceRepoStatusCheck,
      });
      setHasMergeConflict(true);
    }
  };

  const forceRepoStatusCheck = () =>
    window.postMessage('forceRepoStatusCheck', window.location.href);

  return (
    <div className={classes.headerStyling} data-testid={testids.versionControlHeader}>
      <FetchChangesButton
        fetchChanges={fetchChanges}
        displayNotification={repoStatus?.behindBy > 0 ?? false}
        numChanges={repoStatus?.behindBy ?? 0}
      />
      <ShareChangesButton
        changesInLocalRepo={hasChangesInLocalRepo}
        hasMergeConflict={hasMergeConflict}
        hasPushRight={hasPushRights}
        shareChanges={shareChanges}
        displayNotification={repoStatus?.contentStatus?.length > 0 ?? false}
      />
      <SyncModal anchorEl={syncModalAnchorEl} handleClose={handleSyncModalClose} {...modalState} />
    </div>
  );
};
