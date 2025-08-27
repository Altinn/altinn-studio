import { useEffect } from 'react';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';
import postMessages from 'app-shared/utils/postMessages';

export function useListenToMergeConflictInRepo(org: string, app: string) {
  const { refetch: reFetchRepoStatus } = useRepoStatusQuery(org, app);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data === postMessages.forceRepoStatusCheck) {
        await reFetchRepoStatus();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [reFetchRepoStatus]);
}
