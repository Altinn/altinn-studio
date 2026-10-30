import React, { createContext, useContext, useState } from 'react';
import { type Repository } from 'app-shared/types/Repository';
import { type RepoStatus } from 'app-shared/types/RepoStatus';
import { useHasMergeConflict } from '../../hooks/useHasMergeConflict';
import { toast } from 'react-toastify';
import { useRepoPullQuery } from 'app-shared/hooks/queries';
import { useRepoCommitAndPushMutation } from 'app-shared/hooks/mutations';
import { isGitNonFastForwardError } from 'app-shared/hooks/mutations/useRepoCommitAndPushMutation';
import { useTranslation } from 'react-i18next';
import { useGiteaHeaderContext } from '../../../context/GiteaHeaderContext';
import {
  hasCheckoutConflict,
  hasRepoMergeConflict,
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
  onPullSuccess: () => void;
};

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

  const setMergeConflictState = (status?: Partial<RepoStatus>) => {
    queryClient.setQueryData(
      [QueryKey.RepoStatus, owner, repoName],
      toMergeConflictRepoStatus(status),
    );
    setIsLoading(false);
    setHasMergeConflict(true);
  };

  // A share or a pull may have brought in other people's changes, which the open editors should show.
  const refreshAfterPull = async () => {
    onPullSuccess?.();
    await queryClient.invalidateQueries({
      predicate: (query) => query.queryKey.includes(owner) && query.queryKey.includes(repoName),
    });
  };

  const explainFailedShare = async (error: unknown) => {
    const { data: result, isError } = await fetchPullData();
    if (isError) {
      return;
    }
    if (hasRepoMergeConflict(result)) {
      setMergeConflictState(result);
    } else if (hasCheckoutConflict(result)) {
      toast.error(t('sync_header.checkout_conflict_blocked_action'));
    } else if (isGitNonFastForwardError(error)) {
      toast.error(t('api_errors.GT_01'));
    }
    if (result.repositoryStatus === 'Ok') {
      await refreshAfterPull();
    }
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

    const { data: result } = await fetchPullData();
    if (result?.repositoryStatus === 'Ok') {
      toast.success(t('sync_header.sharing_changes_completed'));
      await refreshAfterPull();
    }
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
