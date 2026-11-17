import React, { createContext, useContext, useState } from 'react';
import { type Repository } from 'app-shared/types/Repository';
import { type RepoStatus } from 'app-shared/types/RepoStatus';
import { useHasMergeConflict } from '../../hooks/useHasMergeConflict';
import { toast } from 'react-toastify';
import { useRepoPullQuery } from 'app-shared/hooks/queries';
import { useRepoCommitAndPushMutation } from 'app-shared/hooks/mutations';
import { isGitNonFastForwardError } from 'app-shared/utils/ApiErrorUtils';
import { useTranslation } from 'react-i18next';
import { useGiteaHeaderContext } from '../../../context/GiteaHeaderContext';
import {
  isCheckoutConflict,
  isMergeConflict,
  toMergeConflictRepoStatus,
} from '../../utils/repoStatus';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';

export type VersionControlButtonsContextProps = {
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  hasPushRights: boolean;
  hasMergeConflict: boolean;
  setHasMergeConflict: React.Dispatch<React.SetStateAction<boolean>>;
  repoStatus: RepoStatus;
  commitAndPushChanges: (message: string) => Promise<void>;
  fetchChanges: () => Promise<boolean>;
  onPullSuccess: () => void;
};

type PullOutcome = 'upToDate' | 'mergeConflict' | 'checkoutConflict' | 'failed';

export const VersionControlButtonsContext =
  createContext<Partial<VersionControlButtonsContextProps>>(undefined);

export type VersionControlButtonsContextProviderProps = {
  children: React.ReactNode;
  currentRepo: Repository;
  repoStatus: RepoStatus;
  onPullSuccess: () => void;
};

export const VersionControlButtonsContextProvider = ({
  children,
  currentRepo,
  repoStatus,
  onPullSuccess,
}: Partial<VersionControlButtonsContextProviderProps>) => {
  const { t } = useTranslation();
  const { owner, repoName } = useGiteaHeaderContext();
  const queryClient = useQueryClient();

  const hasPushRights: boolean = currentRepo?.permissions?.push;
  const { hasMergeConflict, setHasMergeConflict } = useHasMergeConflict(repoStatus);

  const { refetch: fetchPullData } = useRepoPullQuery(owner, repoName, true);
  const { mutateAsync: repoCommitAndPushMutation } = useRepoCommitAndPushMutation(owner, repoName);

  const [isLoading, setIsLoading] = useState(false);

  const enterMergeConflictMode = (status: RepoStatus) => {
    queryClient.setQueryData(
      [QueryKey.RepoStatus, owner, repoName],
      toMergeConflictRepoStatus(status),
    );
    setIsLoading(false);
    setHasMergeConflict(true);
  };

  const showToast = (textKey: string) => toast.error(t(textKey), { toastId: textKey });

  // A pull or a share may have brought in other people's changes, which the open editors should show.
  const refreshEditors = async () => {
    onPullSuccess?.();
    await queryClient.invalidateQueries({
      predicate: (query) => query.queryKey.includes(owner) && query.queryKey.includes(repoName),
    });
  };

  const pull = async (): Promise<PullOutcome> => {
    const { data: result, isError } = await fetchPullData();
    // The default error message explains a failure, and a failed refetch keeps the previous result. There is no
    // result when the user has moved to another repository meanwhile.
    if (isError || !result) return 'failed';
    if (isMergeConflict(result)) {
      enterMergeConflictMode(result);
      return 'mergeConflict';
    }
    if (isCheckoutConflict(result)) return 'checkoutConflict';

    await refreshEditors();
    return 'upToDate';
  };

  const fetchChanges = async (): Promise<boolean> => {
    const outcome = await pull();
    if (outcome === 'checkoutConflict') showToast('sync_header.checkout_conflict_blocked_action');
    return outcome === 'upToDate';
  };

  const explainFailedShare = async (error: unknown) => {
    const outcome = await pull();
    // Other errors already show the default error message.
    if (!isGitNonFastForwardError(error)) return;
    if (outcome === 'checkoutConflict') showToast('sync_header.checkout_conflict_blocked_action');
    if (outcome === 'upToDate') showToast('sync_header.sharing_changes_rejected');
  };

  const commitAndPushChanges = async (commitMessage: string) => {
    setIsLoading(true);

    try {
      await repoCommitAndPushMutation({ commitMessage });
    } catch (error) {
      console.error(error);
      await explainFailedShare(error);
      setIsLoading(false);
      return;
    }

    // Sharing combined the user's changes with everything on Gitea, so there is nothing to pull.
    toast.success(t('sync_header.sharing_changes_completed'));
    void refreshEditors();
  };

  return (
    <VersionControlButtonsContext.Provider
      value={{
        isLoading,
        setIsLoading,
        hasPushRights,
        hasMergeConflict,
        setHasMergeConflict,
        commitAndPushChanges,
        fetchChanges,
        repoStatus,
        onPullSuccess,
      }}
    >
      {children}
    </VersionControlButtonsContext.Provider>
  );
};

export const useVersionControlButtonsContext = (): Partial<VersionControlButtonsContextProps> => {
  const context = useContext(VersionControlButtonsContext);
  if (context === undefined) {
    throw new Error(
      'useVersionControlButtonsContext must be used within a VersionControlButtonsContextProvider',
    );
  }
  return context;
};
