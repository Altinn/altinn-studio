import { useMutation, useMutationState } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { isDataPostError } from 'src/features/attachments/isDataPostError';
import { attachmentMutationKeys, type PendingAttachmentMutation } from 'src/features/attachments/tools';
import { useLaxInstanceId, useOptimisticallyRemoveDataElement } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { backendValidationIssueGroupListToObject } from 'src/features/validation';
import { useUpdateIncrementalValidations } from 'src/features/validation/backendValidation/useUpdateIncrementalValidations';
import { doUpdateAttachmentTags } from 'src/queries/queries';
import type { SetTagsRequest } from 'src/queries/queries';

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

    return useMutation({
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
  },

  useAttachmentsRemoveMutation() {
    const { doAttachmentRemove } = useAppMutations();
    const instanceId = useLaxInstanceId();
    const language = useCurrentLanguage();
    const optimisticallyRemoveDataElement = useOptimisticallyRemoveDataElement();

    return useMutation({
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
  },

  useAttachmentUpdateTagsMutation() {
    const instanceId = useLaxInstanceId();
    const updateIncrementalValidations = useUpdateIncrementalValidations();

    return useMutation({
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
  },
};
