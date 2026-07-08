import { useCallback } from 'react';
import { toast } from 'react-toastify';

import { useIsMutating, useMutation, useMutationState, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import type { AxiosError } from 'axios';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { isDataPostError } from 'src/features/attachments';
import { sortAttachmentsByName } from 'src/features/attachments/sortAttachments';
import {
  attachmentMutationKeys,
  type AttachmentNode,
  attachmentSelector,
  type PendingAttachmentMutation,
} from 'src/features/attachments/tools';
import { FileScanResults } from 'src/features/attachments/types';
import { hasPendingAttachmentScans, hasTemporaryAttachments } from 'src/features/attachments/utils';
import { FormStore } from 'src/features/form/FormContext';
import { dataModelPairsToObject } from 'src/features/formData/types';
import {
  useInstanceDataQuery,
  useLaxInstanceId,
  useOptimisticallyRemoveDataElement,
  useOptimisticallyUpdateDataElement,
  useSelectFromInstanceData,
} from 'src/features/instance/InstanceContext';
import { useProcessTaskId } from 'src/features/instance/useProcessTaskId';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { backendValidationIssueGroupListToObject } from 'src/features/validation';
import { useUpdateIncrementalValidations } from 'src/features/validation/backendValidation/useUpdateIncrementalValidations';
import { useWaitForState } from 'src/hooks/useWaitForState';
import { getComponentBehaviors } from 'src/layout';
import { doUpdateAttachmentTags } from 'src/queries/queries';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { deriveRuntimeNodeRefs } from 'src/utils/layout/deriveRuntimeNodeRefs';
import { useIntermediateItem } from 'src/utils/layout/hooks';
import { getIndexedDataModelBindings } from 'src/utils/layout/rowContext';
import { splitDashedKey } from 'src/utils/splitDashedKey';
import type {
  DataPostResponse,
  IAttachment,
  IAttachmentsMap,
  IFailedAttachment,
  TemporaryAttachment,
  UploadedAttachment,
} from 'src/features/attachments';
import type { AttachmentActionUpload, AttachmentUploadResult } from 'src/features/attachments/AttachmentsStore';
import type { AttachmentStateInfo } from 'src/features/attachments/types';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { FDActionResult } from 'src/features/formData/FormDataWriteStateMachine';
import type { IDataModelBindingsList, IDataModelBindingsSimple } from 'src/layout/common.generated';
import type { RejectedFileError } from 'src/layout/FileUpload/RejectedFileError';
import type { SetTagsRequest } from 'src/queries/queries';
import type { IData } from 'src/types/shared';

export interface AttachmentActionUpdate {
  tags: string[];
  nodeId: string;
  attachment: UploadedAttachment;
}

export interface AttachmentActionRemove {
  nodeId: string;
  attachment: UploadedAttachment;
  dataModelBindings: IDataModelBindingsSimple | IDataModelBindingsList | undefined;
}

interface AttachmentUploadVariables {
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

const emptyArray = [];
const ATTACHMENT_STATE_RESULTS = {
  infected: { hasPending: false, state: FileScanResults.Infected },
  uploading: { hasPending: true, state: 'uploading' },
  pending: { hasPending: true, state: FileScanResults.Pending },
  ready: { hasPending: false, state: 'ready' },
} as const;

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function usePendingAttachmentMutations(): PendingAttachmentMutation[] {
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
}

function useAttachmentNode(baseComponentId: string): AttachmentNode {
  const indexedId = useIndexedId(baseComponentId);
  const item = useIntermediateItem(baseComponentId);
  return {
    id: indexedId,
    baseId: baseComponentId,
    dataModelBindings: item.dataModelBindings as AttachmentNode['dataModelBindings'],
  };
}

export const useAttachmentsFor = (baseComponentId: string): IAttachment[] => {
  const node = useAttachmentNode(baseComponentId);
  const instanceData = useInstanceDataQuery({ select: (instance) => instance.data }).data ?? emptyArray;
  const taskId = useProcessTaskId();
  const pendingMutations = usePendingAttachmentMutations();
  return FormStore.raw.useMemoSelector((state) =>
    attachmentSelector(node, state, instanceData, getApplicationMetadata(), taskId, pendingMutations),
  );
};

export const useFailedAttachmentsFor = (baseComponentId: string): IFailedAttachment[] => {
  const indexedId = useIndexedId(baseComponentId);
  return FormStore.raw.useShallowSelector((state) =>
    Object.values(state.attachments.failed[indexedId] ?? {}).sort(sortAttachmentsByName),
  );
};

export const useAllAttachments = (): IAttachmentsMap => {
  const instanceData = useInstanceDataQuery({ select: (instance) => instance.data }).data ?? emptyArray;
  const taskId = useProcessTaskId();
  const pendingMutations = usePendingAttachmentMutations();
  return FormStore.raw.useMemoSelector((state) => {
    const attachments: IAttachmentsMap = {};
    for (const node of deriveRuntimeNodeRefs(state)) {
      const component = state.bootstrap.layoutLookups.getComponent(node.baseId);
      if (!getComponentBehaviors(component.type)?.canHaveAttachments) {
        continue;
      }
      attachments[node.id] = attachmentSelector(
        {
          id: node.id,
          baseId: node.baseId,
          dataModelBindings: getIndexedDataModelBindings(
            component.dataModelBindings,
            node.rowContexts,
          ) as AttachmentNode['dataModelBindings'],
        },
        state,
        instanceData,
        getApplicationMetadata(),
        taskId,
        pendingMutations,
      );
    }
    return attachments;
  });
};

export const useHasPendingAttachments = (): boolean => {
  const hasTemporary = FormStore.raw.useLaxSelector(hasTemporaryAttachments);
  const hasActiveMutations = useIsMutating({ mutationKey: attachmentMutationKeys.all, status: 'pending' }) > 0;
  const instanceData = useInstanceDataQuery({ select: (instance) => instance.data }).data ?? emptyArray;
  return hasTemporary === true || hasActiveMutations || hasPendingAttachmentScans(instanceData);
};

export const useAttachmentState = (): AttachmentStateInfo => {
  const allAttachments = useAllAttachments();
  const hasPending = useHasPendingAttachments();
  const instanceData = useInstanceDataQuery({ select: (instance) => instance.data }).data ?? emptyArray;

  if (
    Object.values(allAttachments).some((attachments) =>
      attachments?.some(
        (attachment) => attachment.uploaded && attachment.data.fileScanResult === FileScanResults.Infected,
      ),
    )
  ) {
    return ATTACHMENT_STATE_RESULTS.infected;
  }
  if (hasPending && !hasPendingAttachmentScans(instanceData)) {
    return ATTACHMENT_STATE_RESULTS.uploading;
  }
  if (hasPendingAttachmentScans(instanceData)) {
    return ATTACHMENT_STATE_RESULTS.pending;
  }
  return ATTACHMENT_STATE_RESULTS.ready;
};

export function useAttachmentsUploader() {
  const addTemporary = FormStore.raw.useStaticSelector((state) => state.attachments.addTemporaryAttachments);
  const finishUploads = FormStore.raw.useStaticSelector((state) => state.attachments.finishAttachmentUploads);
  const { mutateAsync: uploadAttachment } = useAttachmentsUploadMutation();
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
}

export function useAttachmentsUpdater() {
  const { mutateAsync: updateTags } = useAttachmentUpdateTagsMutation();
  const optimisticallyUpdateDataElement = useOptimisticallyUpdateDataElement();
  const { lang } = useLanguage();

  return useCallback(
    async ({ tags, attachment, nodeId }: AttachmentActionUpdate) => {
      const tagsToAdd = tags.filter((tag) => !attachment.data.tags?.includes(tag));
      const tagsToRemove = attachment.data.tags?.filter((tag) => !tags.includes(tag)) ?? [];
      if ([...tagsToAdd].sort().join(',') === [...tagsToRemove].sort().join(',')) {
        return;
      }

      try {
        await updateTags({ nodeId, dataElementId: attachment.data.id, setTagsRequest: { tags } });
        optimisticallyUpdateDataElement(attachment.data.id, (dataElement) => ({ ...dataElement, tags }));
      } catch {
        toast(lang('form_filler.file_uploader_validation_error_update'), { type: 'error' });
      }
    },
    [lang, optimisticallyUpdateDataElement, updateTags],
  );
}

export function useAttachmentsRemover() {
  const { mutateAsync: removeAttachment } = useAttachmentsRemoveMutation();
  const { lang } = useLanguage();
  const setLeafValue = FormStore.data.useSetLeafValue();
  const removeValueFromList = FormStore.data.useRemoveValueFromList();

  return useCallback(
    async ({ attachment, dataModelBindings, nodeId }: AttachmentActionRemove) => {
      try {
        await removeAttachment({ nodeId, dataElementId: attachment.data.id });
        if (dataModelBindings && 'list' in dataModelBindings) {
          removeValueFromList({ reference: dataModelBindings.list, value: attachment.data.id });
        } else if (dataModelBindings && 'simpleBinding' in dataModelBindings) {
          setLeafValue({ reference: dataModelBindings.simpleBinding, newValue: undefined });
        }
        return true;
      } catch {
        toast(lang('form_filler.file_uploader_validation_error_delete'), { type: 'error' });
        return false;
      }
    },
    [lang, removeAttachment, removeValueFromList, setLeafValue],
  );
}

export function useAttachmentsAwaiter() {
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
}

export const useDeleteFailedAttachment = () =>
  FormStore.raw.useStaticSelector((state) => state.attachments.deleteFailedAttachment);

export function useAddRejectedAttachments() {
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
}

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

function useAttachmentsUploadMutation() {
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
}

function useAttachmentsRemoveMutation() {
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
}

function useAttachmentUpdateTagsMutation() {
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
}
