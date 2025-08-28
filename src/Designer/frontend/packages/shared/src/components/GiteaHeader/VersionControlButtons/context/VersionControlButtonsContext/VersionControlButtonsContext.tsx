import React, { createContext, useContext, useState } from 'react';
import { type Repository } from 'app-shared/types/Repository';
import { type RepoStatus } from 'app-shared/types/RepoStatus';
import { useHasMergeConflict } from '../../hooks/useHasMergeConflict';
import { toast } from 'react-toastify';
import { useRepoPullQuery } from 'app-shared/hooks/queries';
import { useRepoCommitAndPushMutation } from 'app-shared/hooks/mutations';
import { useTranslation } from 'react-i18next';
import { useGiteaHeaderContext } from '../../../context/GiteaHeaderContext';

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

  const hasPushRights: boolean = currentRepo?.permissions?.push;
  const { hasMergeConflict, setHasMergeConflict } = useHasMergeConflict(repoStatus);

  const { refetch: fetchPullData } = useRepoPullQuery(owner, repoName, true);
  const { mutateAsync: repoCommitAndPushMutation } = useRepoCommitAndPushMutation(owner, repoName);

  const [isLoading, setIsLoading] = useState(false);

  const commitAndPushChanges = async (commitMessage: string) => {
    setIsLoading(true);

    try {
      await repoCommitAndPushMutation({ commitMessage });
    } catch (error) {
      console.error(error);
      const { data: result } = await fetchPullData();
      if (result.hasMergeConflict || result.repositoryStatus === 'CheckoutConflict') {
        // if pull resulted in a merge conflict, show merge conflict message
        forceRepoStatusCheck();
        setIsLoading(false);
        setHasMergeConflict(true);
      }
      return;
    }

    const { data: result } = await fetchPullData();
    if (result.repositoryStatus === 'Ok') {
      toast.success(t('sync_header.sharing_changes_completed'));
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

const forceRepoStatusCheck = () => window.postMessage('forceRepoStatusCheck', window.location.href);
