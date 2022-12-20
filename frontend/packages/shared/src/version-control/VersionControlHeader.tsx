import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { get, post } from '../utils/networking';
import type { IContentStatus, IGitStatus } from '../types/global';
import { getLanguageFromKey } from '../utils/language';
import postMessages from '../utils/postMessages';
import { FetchChangesButton } from './FetchChangesButton';
import { ShareChangesButton } from './ShareChangesButton';
import { CloneButton } from './CloneButton';
import { CloneModal } from './CloneModal';
import { SyncModal } from './SyncModal';
import {
  repoCommitPath,
  repoMetaPath,
  repoPullPath,
  repoPushPath,
  repoStatusPath,
} from '../api-paths';
import classes from './VersionControlHeader.module.css';
import { useParams } from 'react-router-dom';

export interface IVersionControlHeaderProps {
  language: any;
  type?: 'fetchButton' | 'shareButton' | 'header';
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
  const cancelToken = axios.CancelToken;
  const t = (key: string) => getLanguageFromKey(key, props.language);
  const { org, app } = useParams();
  const source = cancelToken.source();
  const [hasPushRight, setHasPushRight] = useState(props.hasPushRight);
  const [hasMergeConflict, setHasMergeConflict] = useState(false);
  const [hasChangesInMaster, setHasChangesInMaster] = useState(false);
  const [hasChangesInLocalRepo, setHasChangesInLocalRepo] = useState(false);
  const [modalState, setModalState] = useState(initialModalState);
  const [syncModalAnchorEl, setSyncModalAnchorEl] = useState(null);
  const [cloneModalAnchor, setCloneModalAnchor] = useState(null);

  useEffect(() => {
    if (hasPushRight === undefined) {
      get(repoMetaPath(org, app), {
        cancelToken: source.token,
      })
        .then((currentRepo) => {
          setHasPushRight(currentRepo.permissions.push);
        })
        .catch((err) => {
          if (axios.isCancel(err)) {
            // This is handy when debugging axios cancelations when unmounting
            // TODO: Fix other cancelations when unmounting in this component
            // console.info('Component did unmount. Get canceled.');
          } else {
            // TODO: Handle error
            console.error('getRepoPermissions failed', err);
          }
        });
    }
    return () => source.cancel('ComponentWillUnmount');
  }, [hasPushRight, source, app, org]);

  const getStatus = (callbackFunc?: any) => {
    get(repoStatusPath(org, app))
      .then((result: IGitStatus) => {
        setHasMergeConflict(result.repositoryStatus === 'MergeConflict');
        if (callbackFunc) {
          callbackFunc(result);
        } else if (result) {
          setHasChangesInMaster(result.behindBy !== 0);
          setHasChangesInLocalRepo(hasLocalChanges(result));
        }
      })
      .catch(() => {
        if (modalState.isLoading) {
          setModalState({
            ...initialModalState,
            header: t('sync_header.repo_is_offline'),
            isLoading: false,
          });
        }
      });
  };

  const handleSyncModalClose = () => {
    if (!hasMergeConflict) {
      setSyncModalAnchorEl(null);
    }
  };

  const fetchChanges = (currentTarget: any) => {
    setSyncModalAnchorEl(currentTarget);
    setModalState({
      ...initialModalState,
      header: t('sync_header.fetching_latest_version'),
      isLoading: true,
    });
    get(repoPullPath(org, app))
      .then((result: any) => {
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
          window.postMessage(postMessages.refetchFiles, window.location.href);
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
      })
      .catch(() => {
        if (modalState.isLoading) {
          setModalState({
            ...initialModalState,
            header: t('sync_header.repo_is_offline'),
            isLoading: false,
          });
        }
      });
  };

  const shareChanges = (currentTarget: any, showNothingToPush: boolean) => {
    setSyncModalAnchorEl(currentTarget);
    if (showNothingToPush) {
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
      getStatus((result: IGitStatus) => {
        if (result) {
          if (!hasLocalChanges(result) && result.aheadBy === 0) {
            // if user has nothing to commit => show nothing to push message
            setModalState({
              ...initialModalState,
              shouldShowDoneIcon: true,
              header: t('sync_header.nothing_to_push'),
            });
          } else if (!hasLocalChanges(result) && result.aheadBy > 0) {
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
      });
    } else {
      // if user don't have push rights, show modal stating no access to share changes
      setModalState({
        ...initialModalState,
        header: t('sync_header.sharing_changes_no_access'),
        descriptionText: [t('sync_header.sharing_changes_no_access_submessage')],
      });
    }
  };

  const pushChanges = () => {
    setModalState({
      ...initialModalState,
      header: t('sync_header.sharing_changes'),
      isLoading: true,
    });
    post(repoPushPath(org, app))
      .then(() => {
        setHasChangesInMaster(false);
        setHasChangesInLocalRepo(false);
        setModalState({
          ...initialModalState,
          header: t('sync_header.sharing_changes_completed'),
          descriptionText: [t('sync_header.sharing_changes_completed_submessage')],
          shouldShowDoneIcon: true,
        });
      })
      .catch(() => {
        if (modalState.isLoading) {
          setModalState({
            ...initialModalState,
            header: t('sync_header.repo_is_offline'),
            isLoading: false,
          });
        }
      });
    forceRepoStatusCheck();
  };

  const commitChanges = (commitMessage: string) => {
    setModalState({
      ...initialModalState,
      header: t('sync_header.validating_changes'),
      descriptionText: [],
      isLoading: true,
    });
    const options = {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    };
    const bodyData = JSON.stringify({
      message: commitMessage,
      org,
      repository: app,
    });
    post(repoCommitPath(org, app), bodyData, options)
      .then(() => {
        get(repoPullPath(org, app))
          .then((result: any) => {
            // if pull was successfull, show app updated message
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
          })
          .catch(() => {
            if (modalState.isLoading) {
              setModalState({
                ...initialModalState,
                header: t('sync_header.repo_is_offline'),
                isLoading: false,
              });
            }
          });
      })
      .catch(() => {
        if (modalState.isLoading) {
          setModalState({
            ...initialModalState,
            header: t('sync_header.repo_is_offline'),
            isLoading: false,
          });
        }
      });
  };

  const forceRepoStatusCheck = () =>
    window.postMessage('forceRepoStatusCheck', window.location.href);
  const closeCloneModal = () => setCloneModalAnchor(null);
  const openCloneModal = (event: React.MouseEvent) => setCloneModalAnchor(event.currentTarget);
  const type = props.type || 'header';

  return (
    <>
      {type === 'header' ? (
        <div className={classes.headerStyling} data-testid='version-control-header'>
          <CloneButton onClick={openCloneModal} buttonText={t('sync_header.clone')} />
          <FetchChangesButton
            changesInMaster={hasChangesInMaster}
            fetchChanges={fetchChanges}
            buttonText={t('sync_header.fetch_changes')}
          />
          <ShareChangesButton
            changesInLocalRepo={hasChangesInLocalRepo}
            hasMergeConflict={hasMergeConflict}
            hasPushRight={hasPushRight}
            language={props.language}
            shareChanges={shareChanges}
          />
          <SyncModal
            anchorEl={syncModalAnchorEl}
            handleClose={handleSyncModalClose}
            {...modalState}
          />
          <CloneModal
            anchorEl={cloneModalAnchor}
            onClose={closeCloneModal}
            language={props.language}
          />
        </div>
      ) : type === 'fetchButton' ? (
        <div data-testid='version-control-fetch-button'>
          <FetchChangesButton
            changesInMaster={hasChangesInMaster}
            fetchChanges={fetchChanges}
            buttonText={t('sync_header.fetch_changes')}
          />
          <SyncModal
            anchorEl={syncModalAnchorEl}
            handleClose={handleSyncModalClose}
            {...modalState}
          />
        </div>
      ) : type === 'shareButton' ? (
        <div data-testid='version-control-share-button'>
          <ShareChangesButton
            buttonOnly={true}
            changesInLocalRepo={hasChangesInLocalRepo}
            hasMergeConflict={hasMergeConflict}
            hasPushRight={hasPushRight}
            language={props.language}
            shareChanges={shareChanges}
          />
          <SyncModal
            anchorEl={syncModalAnchorEl}
            handleClose={handleSyncModalClose}
            {...modalState}
          />
        </div>
      ) : null}
    </>
  );
};
