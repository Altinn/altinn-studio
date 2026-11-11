import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Starts preview of the app over, in the same session: the task that preview shows gets a new instance at once, and
 * each other task when preview shows it again. The new instances have none of the form data the developer filled in.
 */
export const useStartPreviewOver = (org: string, app: string): (() => Promise<void>) => {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.resetQueries({ queryKey: [QueryKey.PreviewSessionInstance, org, app] }),
    [queryClient, org, app],
  );
};
