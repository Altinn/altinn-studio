import { useCallback } from 'react';

import { useIsMutating, useMutation, useMutationState, useQueryClient } from '@tanstack/react-query';

const PROCESSING_SCOPE_ID = 'globalProcessing';
const PROCESSING_MUTATION_KEY = ['processing'] as const;

/**
 * Union of all mutation keys used in the application.
 * - 'instantiation': Creating new instances
 * - 'exitSubform': Exiting a subform
 * - 'subform': Adding subform entries
 * - 'custom-action': Custom button actions
 * - 'navigate-page': All page navigation (NavigationBar, NavigationButtons, Page, PageGroup)
 */
export type MutationKey = 'instantiation' | 'exitSubform' | 'subform' | 'custom-action' | 'navigate-page';

/**
 * Process keys for 'navigate-page' mutations.
 * Can be a specific action or a dynamic page ID string.
 */
export type NavigatePageProcessKey = 'next' | 'previous' | 'backToSummary' | 'backToPage' | string;

type PerformProcessFn = (callback: () => Promise<unknown>) => Promise<void>;
type PerformProcessWithKeyFn<T extends string> = (processKey: T, callback: () => Promise<unknown>) => Promise<void>;

function getFullMutationKey(mutationKey: MutationKey) {
  return [...PROCESSING_MUTATION_KEY, mutationKey] as const;
}

/**
 * Returns a function to start a long-running process that blocks other processes globally.
 * This variant accepts a process key to track which specific action is running.
 *
 * @param mutationKey - Groups related mutations together for `useIsThisProcessing` checks.
 */
export function useProcessingMutationWithKey<TProcessKey extends string>(
  mutationKey: MutationKey,
): PerformProcessWithKeyFn<TProcessKey> {
  const queryClient = useQueryClient();
  const fullMutationKey = getFullMutationKey(mutationKey);

  const mutation = useMutation({
    mutationKey: fullMutationKey,
    scope: { id: PROCESSING_SCOPE_ID },
    mutationFn: async ({ callback }: { callback: () => Promise<unknown>; processKey: TProcessKey }) => {
      await callback();
    },
  });

  return useCallback(
    async (processKey: TProcessKey, callback: () => Promise<unknown>): Promise<void> => {
      // Synchronous check to return early instead of queueing operations
      if (queryClient.isMutating({ mutationKey: PROCESSING_MUTATION_KEY, status: 'pending' }) > 0) {
        return;
      }
      await mutation.mutateAsync({ callback, processKey });
    },
    [mutation, queryClient],
  );
}

/**
 * Returns a function to start a long-running process that blocks other processes globally.
 *
 * @param mutationKey - Groups related mutations together for `useIsThisProcessing` checks.
 */
export function useProcessingMutation(mutationKey: MutationKey): PerformProcessFn {
  const performProcess = useProcessingMutationWithKey(mutationKey);
  return useCallback((callback: () => Promise<unknown>) => performProcess('', callback), [performProcess]);
}

/**
 * Returns true if any mutation with the given key is currently processing.
 * Use this to show loading states or disable related UI elements.
 */
export function useIsThisProcessing(mutationKey: MutationKey): boolean {
  return (
    useIsMutating({
      mutationKey: getFullMutationKey(mutationKey),
      status: 'pending',
    }) > 0
  );
}

/**
 * Returns true if any processing mutation is currently running globally.
 */
export function useIsAnyProcessing(): boolean {
  return (
    useIsMutating({
      mutationKey: PROCESSING_MUTATION_KEY,
      status: 'pending',
    }) > 0
  );
}

/**
 * Returns the process key of the currently running mutation with the given mutation key.
 * Useful for showing a spinner on the specific button that triggered the action.
 */
export function useCurrentProcessKey<TProcessKey extends string = string>(
  mutationKey: MutationKey,
): TProcessKey | null {
  const variables = useMutationState({
    filters: { mutationKey: getFullMutationKey(mutationKey), status: 'pending' },
    select: (mutation) => (mutation.state.variables as { processKey: TProcessKey } | undefined)?.processKey,
  });

  return variables[0] ?? null;
}
