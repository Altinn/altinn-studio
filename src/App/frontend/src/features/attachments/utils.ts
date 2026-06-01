import type { QueryClient } from '@tanstack/react-query';
import type { StoreApi } from 'zustand';

import { attachmentMutationKeys } from 'src/features/attachments/tools';
import { FileScanResults } from 'src/features/attachments/types';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { IData } from 'src/types/shared';

export function hasTemporaryAttachments(state: FormStoreState): boolean {
  return Object.values(state.attachments.temporary).some((attachments) => Object.keys(attachments ?? {}).length > 0);
}

export function hasActiveAttachmentMutations(queryClient: QueryClient): boolean {
  return queryClient.isMutating({ mutationKey: attachmentMutationKeys.all, status: 'pending' }) > 0;
}

export function hasPendingAttachmentScans(instanceData: IData[]): boolean {
  return instanceData.some((dataElement) => dataElement.fileScanResult === FileScanResults.Pending);
}

/**
 * Infected files are settled errors. They block submission separately, but
 * must not keep asynchronous waiters open forever.
 */
export function hasPendingAttachments(state: FormStoreState, queryClient: QueryClient, instanceData: IData[]): boolean {
  return (
    hasTemporaryAttachments(state) ||
    hasActiveAttachmentMutations(queryClient) ||
    hasPendingAttachmentScans(instanceData)
  );
}

export function waitForAttachments(
  store: StoreApi<FormStoreState>,
  queryClient: QueryClient,
  getInstanceData: () => IData[],
): Promise<void> {
  if (!hasPendingAttachments(store.getState(), queryClient, getInstanceData())) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const subscriptions = [
      store.subscribe(check),
      queryClient.getMutationCache().subscribe(check),
      queryClient.getQueryCache().subscribe(check),
    ];
    check();

    function check() {
      if (!hasPendingAttachments(store.getState(), queryClient, getInstanceData())) {
        for (const unsubscribe of subscriptions) {
          unsubscribe();
        }
        resolve();
      }
    }
  });
}
