import React, { useEffect, useState } from 'react';
import classes from './VersionControlHeader.module.css';
import { FetchChangesButton } from './FetchChangesButton';
import { IContentStatus, IGitStatus } from 'app-shared/types/global';
import { ShareChangesButton } from './ShareChangesButton';
import { SyncModal } from './SyncModal';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRepoMetadataQuery, useRepoPullQuery, useRepoStatusQuery } from '../../hooks/queries';
import { useRepoPushMutation, useCreateRepoCommitMutation } from '../../hooks/mutations';
import { useQueryClient } from '@tanstack/react-query';

export interface IVersionControlHeaderProps {
  hasPushRight?: boolean;
}

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

export const VersionControlHeader = (props: IVersionControlHeaderProps) => {
  const { t } = useTranslation();
  const { org, app } = useParams();
  const [hasPushRight, setHasPushRight] = useState(props.hasPushRight);
  const [hasMergeConflict, setHasMergeConflict] = useState(false);
  const [hasChangesInMaster, setHasChangesInMaster] = useState(false);
  const [hasChangesInLocalRepo, setHasChangesInLocalRepo] = useState(false);
  const [modalState, setModalState] = useState(initialModalState);
  const [syncModalAnchorEl, setSyncModalAnchorEl] = useState(null);
  const { data: currentRepo } = useRepoMetadataQuery(org, app);
  const { data: repoStatus, refetch: refetchRepoStatus } = useRepoStatusQuery(org, app);
  const { refetch: fetchPullData } = useRepoPullQuery(org, app);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (hasPushRight === undefined && currentRepo) {
      setHasPushRight(currentRepo.permissions.push);
    }
  }, [hasPushRight, currentRepo]);
  useEffect(() => {
    if (repoStatus) {
      setHasMergeConflict(repoStatus.repositoryStatus === 'MergeConflict');
      setHasChangesInMaster(repoStatus.behindBy !== 0);
      setHasChangesInLocalRepo(hasLocalChanges(repoStatus));
    }
  }, [repoStatus]);

  const handleSyncModalClose = () => {
    if (!(repoStatus?.repositoryStatus === 'MergeConflict')) {
      setSyncModalAnchorEl(null);
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
      setHasChangesInMaster(result.behindBy !== 0);
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
        btnMethod: commitChanges,
      });
    }
  };

  const shareChanges = async (currentTarget: any) => {
    setSyncModalAnchorEl(currentTarget);
    const { data: repoStatusResult } = await refetchRepoStatus();
    if (!hasLocalChanges(repoStatusResult)) {
      setModalState({
        ...initialModalState,
        shouldShowDoneIcon: true,
        header: t('sync_header.nothing_to_push'),
      });
    }
    if (hasPushRight) {
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
        } else if (!hasLocalChanges(repoStatusResult) && repoStatusResult.aheadBy > 0) {
          setModalState({
            ...initialModalState,
            header: t('sync_header.validation_completed'),
            btnText: t('sync_header.share_changes'),
            shouldShowDoneIcon: true,
            isLoading: false,
            btnMethod: pushChanges,
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
            btnMethod: commitChanges,
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

  const repoPushMutation = useRepoPushMutation(org, app);
  const pushChanges = async () => {
    setModalState({
      ...initialModalState,
      header: t('sync_header.sharing_changes'),
      isLoading: true,
    });

    await repoPushMutation.mutateAsync();
    setModalState({
      ...initialModalState,
      header: t('sync_header.sharing_changes_completed'),
      descriptionText: [t('sync_header.sharing_changes_completed_submessage')],
      shouldShowDoneIcon: true,
    });
    forceRepoStatusCheck();
  };

  const repoCommitMutation = useCreateRepoCommitMutation(org, app);
  const commitChanges = async (commitMessage: string) => {
    setModalState({
      ...initialModalState,
      header: t('sync_header.validating_changes'),
      descriptionText: [],
      isLoading: true,
    });
    await repoCommitMutation.mutateAsync({ commitMessage });
    const { data: result } = await fetchPullData();
    if (result.repositoryStatus === 'Ok') {
      setModalState({
        ...initialModalState,
        header: t('sync_header.validation_completed'),
        descriptionText: [],
        btnText: t('sync_header.share_changes'),
        shouldShowDoneIcon: true,
        btnMethod: pushChanges,
      });
    } else if (result.repositoryStatus === 'MergeConflict') {
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
    <div className={classes.headerStyling} data-testid='version-control-header'>
      <FetchChangesButton
        changesInMaster={hasChangesInMaster}
        fetchChanges={fetchChanges}
        buttonText={t('sync_header.fetch_changes')}
      />
      <ShareChangesButton
        changesInLocalRepo={hasChangesInLocalRepo}
        hasMergeConflict={hasMergeConflict}
        hasPushRight={hasPushRight}
        shareChanges={shareChanges}
      />
      <SyncModal anchorEl={syncModalAnchorEl} handleClose={handleSyncModalClose} {...modalState} />
    </div>
  );
};
