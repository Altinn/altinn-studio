import { useEffect, useState } from 'react';

import { useIsMutating } from '@tanstack/react-query';

import { getProcessNextMutationKey, PROCESS_RESUME_MUTATION_KEY } from 'src/core/queries/process/process.queries';

export function useIsProcessNextPending() {
  return useIsMutating({ mutationKey: getProcessNextMutationKey(), status: 'pending' }) > 0;
}

export function useIsRunningProcessNext() {
  const isProcessNextPending = useIsProcessNextPending();
  const [isMutating, setIsMutating] = useState<boolean | null>(null);

  // Only a wrapper mounted mid-mutation may block. Blocking when an already mounted form
  // starts submitting would unmount its validation providers and deadlock the mutation before
  // its request. Release the initial block when it finishes: service-task navigation can retain
  // this wrapper for the next task.
  useEffect(() => {
    setIsMutating((previous) => (previous === null ? isProcessNextPending : previous && isProcessNextPending));
  }, [isProcessNextPending]);

  return isMutating;
}

export function useIsProcessResumePending() {
  return useIsMutating({ mutationKey: PROCESS_RESUME_MUTATION_KEY, status: 'pending' }) > 0;
}
