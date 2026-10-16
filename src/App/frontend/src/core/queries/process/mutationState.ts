import { useEffect, useState } from 'react';

import { useIsMutating, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { getProcessNextMutationKey, PROCESS_RESUME_MUTATION_KEY } from 'src/core/queries/process/process.queries';

function isRunningProcessNext(queryClient: QueryClient) {
  return queryClient.isMutating({ mutationKey: getProcessNextMutationKey() }) > 0;
}

export function useIsProcessNextPending() {
  return useIsMutating({ mutationKey: getProcessNextMutationKey(), status: 'pending' }) > 0;
}

export function useIsRunningProcessNext() {
  const queryClient = useQueryClient();
  const [isMutating, setIsMutating] = useState<boolean | null>(null);

  // Intentionally wrapped in a useEffect() and saved as a state. If this happens, we'll seemingly be locked out
  // with a <Loader /> forever, but when this happens, we also know we'll be re-rendered soon. This is only meant to
  // block rendering when we're calling process/next.
  //
  // Deliberately sampled once (not subscribed via useIsMutating): the mutation's pre-request phase
  // (beforeProcessNext -> onFormSubmitValidation -> useWaitForValidation) only resolves while the
  // form/validation providers stay mounted. Subscribing here swaps the task tree for the <Loader />
  // as soon as the mutation starts, unmounting those providers and deadlocking the mutation - it
  // never reaches process/next and never settles, so the Loader stays forever. This check only
  // exists to cover mounting mid-mutation; while mounted, blocking is driven by the server-side
  // workflow annotation instead.
  useEffect(() => {
    setIsMutating(isRunningProcessNext(queryClient));
  }, [queryClient]);

  return isMutating;
}

export function useIsProcessResumePending() {
  return useIsMutating({ mutationKey: PROCESS_RESUME_MUTATION_KEY, status: 'pending' }) > 0;
}
