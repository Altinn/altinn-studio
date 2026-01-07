import { useCheckoutWithUncommittedChangesHandling } from 'app-shared/hooks/mutations/useCheckoutWithUncommittedChangesHandling';
import type { UncommittedChangesError } from 'app-shared/types/api/BranchTypes';

export interface UseCheckoutBranchAndReloadOptions {
  onUncommittedChanges?: (error: UncommittedChangesError) => void;
}

export function useCheckoutBranchAndReload(
  org: string,
  app: string,
  options: UseCheckoutBranchAndReloadOptions = {},
) {
  const { onUncommittedChanges } = options;

  return useCheckoutWithUncommittedChangesHandling(org, app, {
    onUncommittedChanges,
    onSuccess: async () => location.reload(),
  });
}
