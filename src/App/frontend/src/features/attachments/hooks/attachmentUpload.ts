import { useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

import { AttachmentMutations } from 'src/features/attachments/hooks/attachmentMutations';
import { attachmentMutationKeys } from 'src/features/attachments/tools';
import { FormStore } from 'src/features/form/FormContext';
import { dataModelPairsToObject } from 'src/features/formData/types';
import { useSelectFromInstanceData } from 'src/features/instance/InstanceContext';
import { backendValidationIssueGroupListToObject } from 'src/features/validation';
import { useWaitForState } from 'src/hooks/useWaitForState';
import { splitDashedKey } from 'src/utils/splitDashedKey';
import type { DataPostResponse, IFailedAttachment, TemporaryAttachment } from 'src/features/attachments';
import type { AttachmentActionUpload, AttachmentUploadResult } from 'src/features/attachments/AttachmentsStore';
import type { AttachmentUploadVariables } from 'src/features/attachments/hooks/attachmentMutations';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { FDActionResult } from 'src/features/formData/FormDataWriteStateMachine';
import type { IDataModelBindingsList, IDataModelBindingsSimple } from 'src/layout/common.generated';
import type { RejectedFileError } from 'src/layout/FileUpload/RejectedFileError';
import type { IData } from 'src/types/shared';

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export const AttachmentUpload = {
  useAttachmentsUploader() {
    const addTemporary = FormStore.raw.useStaticSelector((state) => state.attachments.addTemporaryAttachments);
    const finishUploads = FormStore.raw.useStaticSelector((state) => state.attachments.finishAttachmentUploads);
    const { mutateAsync: uploadAttachment } = AttachmentMutations.useAttachmentsUploadMutation();
    const setAttachmentsInDataModel = useSetAttachmentInDataModel();
    const lock = FormStore.data.useLocking('__attachment__upload__');

    return useCallback(
      async ({
        files,
        ...action
      }: Omit<AttachmentActionUpload, 'files'> & {
        files: File[];
        dataModelBindings: IDataModelBindingsSimple | IDataModelBindingsList | undefined;
      }) => {
        const fullAction: AttachmentActionUpload = {
          ...action,
          files: files.map((file) => ({ temporaryId: uuidv4(), file })),
        };
        addTemporary(fullAction);

        const { unlock } = await lock();
        const results: AttachmentUploadResult[] = [];
        const updatedData: FDActionResult = { updatedDataModels: {}, updatedValidationIssues: {} };

        for (const { file, temporaryId } of fullAction.files) {
          const { baseComponentId: dataTypeId } = splitDashedKey(action.nodeId);
          try {
            const reply = await uploadAttachment({ dataTypeId, file, nodeId: action.nodeId, temporaryId });
            results.push({ temporaryId, newDataElementId: reply.newDataElementId });
            updatedData.instance = reply.instance;
            updatedData.updatedDataModels = {
              ...updatedData.updatedDataModels,
              ...dataModelPairsToObject(reply.newDataModels),
            };
            updatedData.updatedValidationIssues = {
              ...updatedData.updatedValidationIssues,
              ...backendValidationIssueGroupListToObject(reply.validationIssues),
            };
          } catch (error) {
            results.push({ temporaryId, error: toError(error) });
          }
        }

        setAttachmentsInDataModel(
          results.flatMap((result) => ('newDataElementId' in result ? [result.newDataElementId] : [])),
          action.dataModelBindings,
        );
        unlock(updatedData);
        finishUploads(fullAction, results);
      },
      [addTemporary, finishUploads, lock, setAttachmentsInDataModel, uploadAttachment],
    );
  },

  useAttachmentsAwaiter() {
    const store = FormStore.raw.useStore();
    const queryClient = useQueryClient();
    const selectFromInstance = useSelectFromInstanceData();
    const waitFor = useWaitForState<IData | false, FormStoreState>(store);

    return useCallback(
      (nodeId: string, attachment: TemporaryAttachment) =>
        waitFor((state, setReturnValue) => {
          if (state.attachments.temporary[nodeId]?.[attachment.data.temporaryId]) {
            return false;
          }
          if (state.attachments.failed[nodeId]?.[attachment.data.temporaryId]) {
            setReturnValue(false);
            return true;
          }

          const upload = queryClient
            .getMutationCache()
            .findAll({ mutationKey: attachmentMutationKeys.upload(), status: 'success' })
            .find((mutation) => {
              const variables = mutation.state.variables as AttachmentUploadVariables;
              return variables.nodeId === nodeId && variables.temporaryId === attachment.data.temporaryId;
            });
          const dataElementId = (upload?.state.data as DataPostResponse | undefined)?.newDataElementId;
          const uploaded = dataElementId
            ? selectFromInstance((instance) => instance.data.find((data) => data.id === dataElementId))
            : undefined;
          if (uploaded) {
            setReturnValue(uploaded);
            return true;
          }

          throw new Error('Given attachment not found after upload finished');
        }),
      [queryClient, selectFromInstance, waitFor],
    );
  },

  useDeleteFailedAttachment: () => FormStore.raw.useStaticSelector((state) => state.attachments.deleteFailedAttachment),

  useAddRejectedAttachments() {
    const addFailedAttachments = FormStore.raw.useStaticSelector((state) => state.attachments.addFailedAttachments);
    return useCallback(
      (nodeId: string, errors: RejectedFileError[]) => {
        const attachments: IFailedAttachment[] = errors.map((error) => ({
          data: {
            temporaryId: uuidv4(),
            filename: error.data.rejection.file.name,
            size: error.data.rejection.file.size,
          },
          error,
        }));
        addFailedAttachments({ nodeId, attachments });
      },
      [addFailedAttachments],
    );
  },
};

function useSetAttachmentInDataModel() {
  const setLeafValue = FormStore.data.useSetLeafValue();
  const appendToListUnique = FormStore.data.useAppendToListUnique();
  const debounce = FormStore.data.useDebounceImmediately();

  return useCallback(
    (attachmentIds: string[], dataModelBindings: IDataModelBindingsSimple | IDataModelBindingsList | undefined) => {
      if (dataModelBindings && 'list' in dataModelBindings) {
        for (const attachmentId of attachmentIds) {
          appendToListUnique({ reference: dataModelBindings.list, newValue: attachmentId });
        }
        attachmentIds.length && debounce('listChanges');
      } else if (dataModelBindings && 'simpleBinding' in dataModelBindings) {
        for (const attachmentId of attachmentIds) {
          setLeafValue({ reference: dataModelBindings.simpleBinding, newValue: attachmentId });
        }
        attachmentIds.length && debounce('listChanges');
      }
    },
    [appendToListUnique, debounce, setLeafValue],
  );
}
