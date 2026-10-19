import { useCallback } from 'react';

import { useIsMutating, useMutation, useMutationState, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { StoreApi } from 'zustand';

import { doUpdateAttachmentTags } from 'src/core/api-client/app.api';
import { attachmentMutationKeys } from 'src/core/queries/attachments/attachment.queries';
import {
  hasPendingAttachments,
  hasPendingAttachmentScans,
  hasTemporaryAttachments,
  waitForAttachments,
} from 'src/core/queries/attachments/attachmentState';
import { mutationResult } from 'src/core/queries/mutationResult';
import { useAppMutations } from 'src/core/queries/QueryProvider';
import { isDataPostError } from 'src/features/attachments/isDataPostError';
import { type PendingAttachmentMutation } from 'src/features/attachments/tools';
import { useLaxInstanceId, useOptimisticallyRemoveDataElement } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { backendValidationIssueGroupListToObject } from 'src/features/validation';
import { useUpdateIncrementalValidations } from 'src/features/validation/backendValidation/useUpdateIncrementalValidations';
import type { SetTagsRequest } from 'src/core/api-client/app.api';
import type { DataPostResponse } from 'src/features/attachments';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { IData } from 'src/types/shared';

export interface AttachmentUploadVariables {
  dataTypeId: string;
  file: File;
  nodeId: string;
  temporaryId: string;
}

interface AttachmentRemoveVariables {
  nodeId: string;
  dataElementId: string;
}

interface AttachmentUpdateVariables {
  nodeId: string;
  dataElementId: string;
  setTagsRequest: SetTagsRequest;
}

export const AttachmentMutations = {
  usePendingAttachmentMutations(): PendingAttachmentMutation[] {
    return useMutationState({
      filters: { mutationKey: attachmentMutationKeys.all, status: 'pending' },
      select: (mutation): PendingAttachmentMutation | undefined => {
        const type = mutation.options.mutationKey?.[1];
        if (type === 'upload') {
          const variables = mutation.state.variables as AttachmentUploadVariables;
          return { type, nodeId: variables.nodeId, temporaryId: variables.temporaryId };
        }
        if (type === 'update' || type === 'remove') {
          const variables = mutation.state.variables as AttachmentUpdateVariables | AttachmentRemoveVariables;
          return { type, nodeId: variables.nodeId, dataElementId: variables.dataElementId };
        }
      },
    }).filter((mutation): mutation is PendingAttachmentMutation => !!mutation);
  },

  useAttachmentsUploadMutation() {
    const { doAttachmentUpload } = useAppMutations();
    const instanceId = useLaxInstanceId();
    const language = useCurrentLanguage();

    const mutation = useMutation({
      mutationKey: attachmentMutationKeys.upload(),
      mutationFn: ({ dataTypeId, file }: AttachmentUploadVariables) => {
        if (!instanceId) {
          throw new Error('Missing instanceId, cannot upload attachment');
        }
        return doAttachmentUpload(instanceId, dataTypeId, language, file);
      },
      onError: (error: AxiosError) => {
        if (!isDataPostError(error.response?.data)) {
          window.logError('Failed to upload attachment:\n', error.message);
        }
      },
    });
    return mutationResult(mutation);
  },

  useAttachmentsRemoveMutation() {
    const { doAttachmentRemove } = useAppMutations();
    const instanceId = useLaxInstanceId();
    const language = useCurrentLanguage();
    const optimisticallyRemoveDataElement = useOptimisticallyRemoveDataElement();

    const mutation = useMutation({
      mutationKey: attachmentMutationKeys.remove(),
      mutationFn: ({ dataElementId }: AttachmentRemoveVariables) => {
        if (!instanceId) {
          throw new Error('Missing instanceId, cannot remove attachment');
        }
        return doAttachmentRemove(instanceId, dataElementId, language);
      },
      onError: (error: AxiosError) => window.logError('Failed to delete attachment:\n', error),
      onSuccess: (_data, { dataElementId }) => optimisticallyRemoveDataElement(dataElementId),
    });
    return mutationResult(mutation);
  },

  useAttachmentUpdateTagsMutation() {
    const instanceId = useLaxInstanceId();
    const updateIncrementalValidations = useUpdateIncrementalValidations();

    const mutation = useMutation({
      mutationKey: attachmentMutationKeys.update(),
      mutationFn: ({ dataElementId, setTagsRequest }: AttachmentUpdateVariables) => {
        if (!instanceId) {
          throw new Error('Missing instanceId, cannot update attachment');
        }
        return doUpdateAttachmentTags({ instanceId, dataElementId, setTagsRequest });
      },
      onError: (error: AxiosError) => window.logError('Failed to add tag to attachment:\n', error),
      onSuccess: (data) => {
        if (data.validationIssues) {
          updateIncrementalValidations(backendValidationIssueGroupListToObject(data.validationIssues));
        }
      },
    });
    return mutationResult(mutation);
  },
};

export function useHasActiveAttachmentMutations() {
  return useIsMutating({ mutationKey: attachmentMutationKeys.all, status: 'pending' }) > 0;
}

export function useAttachmentActivity(store: StoreApi<FormStoreState>, getInstanceData: () => IData[]) {
  const queryClient = useQueryClient();
  const hasPending = useCallback(
    () => hasPendingAttachments(store.getState(), queryClient, getInstanceData()),
    [store, queryClient, getInstanceData],
  );
  const wait = useCallback(
    () => waitForAttachments(store, queryClient, getInstanceData),
    [store, queryClient, getInstanceData],
  );
  return { hasPending, wait };
}

export function useGetUploadedDataElementId() {
  const queryClient = useQueryClient();
  return useCallback(
    (nodeId: string, temporaryId: string): string | undefined => {
      const upload = queryClient
        .getMutationCache()
        .findAll({ mutationKey: attachmentMutationKeys.upload(), status: 'success' })
        .find((mutation) => {
          const variables = mutation.state.variables as AttachmentUploadVariables;
          return variables.nodeId === nodeId && variables.temporaryId === temporaryId;
        });
      return (upload?.state.data as DataPostResponse | undefined)?.newDataElementId;
    },
    [queryClient],
  );
}

export { hasTemporaryAttachments, hasPendingAttachmentScans };
