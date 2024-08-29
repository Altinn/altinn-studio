import { useCallback } from 'react';
import { toast } from 'react-toastify';

import { useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import type { UseMutationOptions } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided } from 'src/core/contexts/context';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { isAttachmentUploaded } from 'src/features/attachments/index';
import { sortAttachmentsByName } from 'src/features/attachments/sortAttachments';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxInstance, useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { getValidationIssueMessage } from 'src/features/validation/backendValidation/backendValidationUtils';
import { useWaitForState } from 'src/hooks/useWaitForState';
import { isAxiosError } from 'src/utils/isAxiosError';
import { nodesProduce } from 'src/utils/layout/NodesContext';
import { NodeDataPlugin } from 'src/utils/layout/plugins/NodeDataPlugin';
import type {
  FileUploaderNode,
  IAttachment,
  IAttachmentsMap,
  TemporaryAttachment,
  UploadedAttachment,
} from 'src/features/attachments/index';
import type { BackendValidationIssue } from 'src/features/validation';
import type { IDataModelBindingsList, IDataModelBindingsSimple } from 'src/layout/common.generated';
import type { CompWithBehavior } from 'src/layout/layout';
import type { IData } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodesContext, NodesStoreFull } from 'src/utils/layout/NodesContext';
import type { NodeDataPluginSetState } from 'src/utils/layout/plugins/NodeDataPlugin';
import type { NodeData } from 'src/utils/layout/types';

export interface AttachmentActionUpload {
  temporaryId: string;
  file: File;
  node: FileUploaderNode;
  dataModelBindings: IDataModelBindingsSimple | IDataModelBindingsList | undefined;
}

export interface AttachmentActionUpdate {
  tags: string[];
  node: FileUploaderNode;
  attachment: UploadedAttachment;
}

export interface AttachmentActionRemove {
  node: FileUploaderNode;
  attachment: UploadedAttachment;
  dataModelBindings: IDataModelBindingsSimple | IDataModelBindingsList | undefined;
}

export type AttachmentsSelector = (node: FileUploaderNode) => IAttachment[];

export interface AttachmentsStorePluginConfig {
  extraFunctions: {
    attachmentUpload: (action: AttachmentActionUpload) => void;
    attachmentUploadFulfilled: (action: AttachmentActionUpload, result: IData) => void;
    attachmentUploadRejected: (action: AttachmentActionUpload, error: string) => void;

    attachmentUpdate: (action: AttachmentActionUpdate) => void;
    attachmentUpdateFulfilled: (action: AttachmentActionUpdate) => void;
    attachmentUpdateRejected: (action: AttachmentActionUpdate, error: AxiosError) => void;

    attachmentRemove: (action: AttachmentActionRemove) => void;
    attachmentRemoveFulfilled: (action: AttachmentActionRemove) => void;
    attachmentRemoveRejected: (action: AttachmentActionRemove, error: AxiosError) => void;
  };
  extraHooks: {
    useAttachmentsUpload: () => (action: Omit<AttachmentActionUpload, 'temporaryId'>) => Promise<string | undefined>;
    useAttachmentsUpdate: () => (action: AttachmentActionUpdate) => Promise<void>;
    useAttachmentsRemove: () => (action: AttachmentActionRemove) => Promise<boolean>;

    useAttachments: (node: FileUploaderNode) => IAttachment[];
    useAttachmentsSelector: () => AttachmentsSelector;
    useWaitUntilUploaded: () => (node: FileUploaderNode, attachment: TemporaryAttachment) => Promise<IData | false>;

    useHasPendingAttachments: () => boolean;
    useAllAttachments: () => IAttachmentsMap;
  };
}

const emptyArray: IAttachment[] = [];

type ProperData = NodeData<CompWithBehavior<'canHaveAttachments'>>;

export class AttachmentsStorePlugin extends NodeDataPlugin<AttachmentsStorePluginConfig> {
  extraFunctions(set: NodeDataPluginSetState): AttachmentsStorePluginConfig['extraFunctions'] {
    return {
      attachmentUpload: ({ file, node, temporaryId }) => {
        set(
          nodesProduce((draft) => {
            const data = draft.nodeData[node.id] as ProperData;
            data.attachments[temporaryId] = {
              uploaded: false,
              updating: false,
              deleting: false,
              data: {
                temporaryId,
                filename: file.name,
                size: file.size,
              },
            } satisfies TemporaryAttachment;
          }),
        );
      },
      attachmentUploadFulfilled: ({ temporaryId, node }, data) => {
        set(
          nodesProduce((draft) => {
            const nodeData = draft.nodeData[node.id] as ProperData;
            delete nodeData.attachments[temporaryId];
            nodeData.attachments[data.id] = {
              temporaryId,
              uploaded: true,
              updating: false,
              deleting: false,
              data,
            } satisfies UploadedAttachment;
          }),
        );
      },
      attachmentUploadRejected: ({ node, temporaryId }, error) => {
        set(
          nodesProduce((draft) => {
            const nodeData = draft.nodeData[node.id] as ProperData;
            delete nodeData.attachments[temporaryId];
            nodeData.attachmentsFailedToUpload[temporaryId] = error;
          }),
        );
      },
      attachmentUpdate: ({ node, attachment, tags }) => {
        set(
          nodesProduce((draft) => {
            const nodeData = draft.nodeData[node.id] as ProperData;
            const attachmentData = nodeData.attachments[attachment.data.id];
            if (isAttachmentUploaded(attachmentData)) {
              attachmentData.updating = true;
              attachmentData.data.tags = tags;
            } else {
              throw new Error('Cannot update a temporary attachment');
            }
          }),
        );
      },
      attachmentUpdateFulfilled: ({ node, attachment }) => {
        set(
          nodesProduce((draft) => {
            const nodeData = draft.nodeData[node.id] as ProperData;
            const attachmentData = nodeData.attachments[attachment.data.id];
            if (isAttachmentUploaded(attachmentData)) {
              attachmentData.updating = false;
            } else {
              throw new Error('Cannot update a temporary attachment');
            }
          }),
        );
      },
      attachmentUpdateRejected: ({ node, attachment }, error) => {
        set(
          nodesProduce((draft) => {
            const nodeData = draft.nodeData[node.id] as ProperData;
            const attachmentData = nodeData.attachments[attachment.data.id];
            if (isAttachmentUploaded(attachmentData)) {
              attachmentData.updating = false;
              attachmentData.error = error;
            } else {
              throw new Error('Cannot update a temporary attachment');
            }
          }),
        );
      },
      attachmentRemove: ({ node, attachment }) => {
        set(
          nodesProduce((draft) => {
            const nodeData = draft.nodeData[node.id] as ProperData;
            const attachmentData = nodeData.attachments[attachment.data.id];
            if (isAttachmentUploaded(attachmentData)) {
              attachmentData.deleting = true;
            } else {
              throw new Error('Cannot remove a temporary attachment');
            }
          }),
        );
      },
      attachmentRemoveFulfilled: ({ node, attachment }) => {
        set(
          nodesProduce((draft) => {
            const nodeData = draft.nodeData[node.id] as ProperData;
            delete nodeData.attachments[attachment.data.id];
          }),
        );
      },
      attachmentRemoveRejected: ({ node, attachment }, error) => {
        set(
          nodesProduce((draft) => {
            const nodeData = draft.nodeData[node.id] as ProperData;
            const attachmentData = nodeData.attachments[attachment.data.id];
            if (isAttachmentUploaded(attachmentData)) {
              attachmentData.deleting = false;
              attachmentData.error = error;
            } else {
              throw new Error('Cannot remove a temporary attachment');
            }
          }),
        );
      },
    };
  }
  extraHooks(store: NodesStoreFull): AttachmentsStorePluginConfig['extraHooks'] {
    return {
      useAttachmentsUpload() {
        const { changeData: changeInstanceData } = useLaxInstance() || {};
        const upload = store.useSelector((state) => state.attachmentUpload);
        const fulfill = store.useSelector((state) => state.attachmentUploadFulfilled);
        const reject = store.useSelector((state) => state.attachmentUploadRejected);
        const { mutateAsync } = useAttachmentsUploadMutation();
        const backendFeatures = useApplicationMetadata().features || {};
        const { langAsString, lang } = useLanguage();
        const setLeafValue = FD.useSetLeafValue();
        const appendToListUnique = FD.useAppendToListUnique();

        return useCallback(
          async (action: Omit<AttachmentActionUpload, 'temporaryId'>) => {
            const temporaryId = uuidv4();
            const fullAction: AttachmentActionUpload = { ...action, temporaryId };
            upload(fullAction);

            try {
              const reply = await mutateAsync({
                dataTypeId: action.node.baseId,
                file: action.file,
              });
              if (!reply || !reply.blobStoragePath) {
                throw new Error('Failed to upload attachment');
              }
              if (action.dataModelBindings && 'list' in action.dataModelBindings) {
                appendToListUnique({
                  path: action.dataModelBindings.list,
                  newValue: reply.id,
                });
              } else if (action.dataModelBindings && 'simpleBinding' in action.dataModelBindings) {
                setLeafValue({
                  path: action.dataModelBindings.simpleBinding,
                  newValue: reply.id,
                });
              }
              fulfill(fullAction, reply);

              changeInstanceData &&
                changeInstanceData((instance) => {
                  if (instance?.data && reply) {
                    return {
                      ...instance,
                      data: [...instance.data, reply],
                    };
                  }

                  return instance;
                });

              return reply.id;
            } catch (err) {
              reject(fullAction, err);

              if (backendFeatures.jsonObjectInDataResponse && isAxiosError(err) && Array.isArray(err.response?.data)) {
                const validationIssues: BackendValidationIssue[] = err.response.data;
                const message = validationIssues
                  .map((issue) => getValidationIssueMessage(issue))
                  .map(({ key, params }) => `- ${langAsString(key, params)}`)
                  .join('\n');
                toast(message, { type: 'error' });
              } else {
                toast(lang('form_filler.file_uploader_validation_error_upload'), { type: 'error' });
              }

              return undefined;
            }
          },
          [
            appendToListUnique,
            backendFeatures.jsonObjectInDataResponse,
            changeInstanceData,
            fulfill,
            lang,
            langAsString,
            mutateAsync,
            reject,
            setLeafValue,
            upload,
          ],
        );
      },
      useAttachmentsUpdate() {
        const { mutateAsync: removeTag } = useAttachmentsRemoveTagMutation();
        const { mutateAsync: addTag } = useAttachmentsAddTagMutation();
        const { changeData: changeInstanceData } = useLaxInstance() || {};
        const { lang } = useLanguage();
        const update = store.useSelector((state) => state.attachmentUpdate);
        const fulfill = store.useSelector((state) => state.attachmentUpdateFulfilled);
        const reject = store.useSelector((state) => state.attachmentUpdateRejected);

        return useCallback(
          async (action: AttachmentActionUpdate) => {
            const { tags, attachment } = action;
            const tagToAdd = tags.filter((t) => !attachment.data.tags?.includes(t));
            const tagToRemove = attachment.data.tags?.filter((t) => !tags.includes(t)) || [];
            const areEqual = tagToAdd.length && tagToRemove.length && tagToAdd[0] === tagToRemove[0];

            // If there are no tags to add or remove, or if the tags are the same, do nothing.
            if ((!tagToAdd.length && !tagToRemove.length) || areEqual) {
              return;
            }

            update(action);
            try {
              if (tagToAdd.length) {
                await Promise.all(tagToAdd.map((tag) => addTag({ dataGuid: attachment.data.id, tagToAdd: tag })));
              }
              if (tagToRemove.length) {
                await Promise.all(
                  tagToRemove.map((tag) => removeTag({ dataGuid: attachment.data.id, tagToRemove: tag })),
                );
              }
              fulfill(action);

              changeInstanceData &&
                changeInstanceData((instance) => {
                  if (instance?.data) {
                    return {
                      ...instance,
                      data: instance.data.map((dataElement) => {
                        if (dataElement.id === attachment.data.id) {
                          return {
                            ...dataElement,
                            tags,
                          };
                        }
                        return dataElement;
                      }),
                    };
                  }
                });
            } catch (error) {
              reject(action, error);
              toast(lang('form_filler.file_uploader_validation_error_update'), { type: 'error' });
            }
          },
          [addTag, changeInstanceData, fulfill, lang, reject, removeTag, update],
        );
      },
      useAttachmentsRemove() {
        const { mutateAsync: removeAttachment } = useAttachmentsRemoveMutation();
        const { changeData: changeInstanceData } = useLaxInstance() || {};
        const { lang } = useLanguage();
        const remove = store.useSelector((state) => state.attachmentRemove);
        const fulfill = store.useSelector((state) => state.attachmentRemoveFulfilled);
        const reject = store.useSelector((state) => state.attachmentRemoveRejected);
        const setLeafValue = FD.useSetLeafValue();
        const removeValueFromList = FD.useRemoveValueFromList();

        return useCallback(
          async (action: AttachmentActionRemove) => {
            remove(action);
            try {
              await removeAttachment(action.attachment.data.id);
              if (action.dataModelBindings && 'list' in action.dataModelBindings) {
                removeValueFromList({
                  path: action.dataModelBindings.list,
                  value: action.attachment.data.id,
                });
              } else if (action.dataModelBindings && 'simpleBinding' in action.dataModelBindings) {
                setLeafValue({
                  path: action.dataModelBindings.simpleBinding,
                  newValue: undefined,
                });
              }

              fulfill(action);

              changeInstanceData &&
                changeInstanceData((instance) => {
                  if (instance?.data) {
                    return {
                      ...instance,
                      data: instance.data.filter((d) => d.id !== action.attachment.data.id),
                    };
                  }
                });

              return true;
            } catch (error) {
              reject(action, error);
              toast(lang('form_filler.file_uploader_validation_error_delete'), { type: 'error' });
              return false;
            }
          },
          [changeInstanceData, fulfill, lang, reject, remove, removeAttachment, removeValueFromList, setLeafValue],
        );
      },
      useAttachments(node) {
        return store.useSelector((state) => {
          if (!node) {
            return emptyArray;
          }

          const nodeData = state.nodeData[node.id];
          if ('attachments' in nodeData) {
            return Object.values(nodeData.attachments).sort(sortAttachmentsByName);
          }

          return emptyArray;
        });
      },
      useAttachmentsSelector() {
        return store.useDelayedSelector({
          mode: 'simple',
          selector: (node: LayoutNode) => (state) => {
            const nodeData = state.nodeData[node.id];
            if (!nodeData) {
              return emptyArray;
            }
            if ('attachments' in nodeData) {
              return Object.values(nodeData.attachments).sort(sortAttachmentsByName);
            }
            return emptyArray;
          },
        }) satisfies AttachmentsSelector;
      },
      useWaitUntilUploaded() {
        const zustandStore = store.useStore();
        const waitFor = useWaitForState<IData | false, NodesContext>(zustandStore);

        return useCallback(
          (node, attachment) =>
            waitFor((state, setReturnValue) => {
              const nodeData = state.nodeData[node.id];
              if (!nodeData || !('attachments' in nodeData) || !('attachmentsFailedToUpload' in nodeData)) {
                setReturnValue(false);
                return true;
              }
              const stillUploading = nodeData.attachments[attachment.data.temporaryId];
              if (stillUploading) {
                return false;
              }
              const errorMessage = nodeData.attachmentsFailedToUpload[attachment.data.temporaryId];
              if (errorMessage !== undefined) {
                setReturnValue(false);
                return true;
              }

              const uploaded = Object.values(nodeData.attachments).find(
                (a) => isAttachmentUploaded(a) && a.temporaryId === attachment.data.temporaryId,
              ) as UploadedAttachment | undefined;
              if (uploaded) {
                setReturnValue(uploaded.data);
                return true;
              }

              throw new Error('Given attachment not found in node');
            }),
          [waitFor],
        );
      },
      useHasPendingAttachments() {
        const out = store.useLaxSelector((state) => {
          for (const id of Object.keys(state.nodeData)) {
            const nodeData = state.nodeData[id];
            if (!nodeData || !('attachments' in nodeData)) {
              continue;
            }

            const attachments = Object.values(nodeData.attachments);
            if (attachments.some((a) => !a.uploaded || a.updating || a.deleting)) {
              return true;
            }
          }
          return false;
        });

        return out === ContextNotProvided ? false : out;
      },
      useAllAttachments() {
        return store.useMemoSelector((state) => {
          const map: IAttachmentsMap = {};
          for (const id of Object.keys(state.nodeData)) {
            const nodeData = state.nodeData[id];
            if (!nodeData || !('attachments' in nodeData)) {
              continue;
            }

            map[id] = Object.values(nodeData.attachments);
          }

          return map;
        });
      },
    };
  }
}

interface MutationVariables {
  dataTypeId: string;
  file: File;
}

function useAttachmentsUploadMutation() {
  const { doAttachmentUpload } = useAppMutations();
  const instanceId = useLaxInstanceData()?.id;

  const options: UseMutationOptions<IData, AxiosError, MutationVariables> = {
    mutationFn: ({ dataTypeId, file }: MutationVariables) => {
      if (!instanceId) {
        throw new Error('Missing instanceId, cannot upload attachment');
      }

      return doAttachmentUpload(instanceId, dataTypeId, file);
    },
    onError: (error: AxiosError) => {
      window.logError('Failed to upload attachment:\n', error.message);
    },
  };

  return useMutation(options);
}

function useAttachmentsAddTagMutation() {
  const { doAttachmentAddTag } = useAppMutations();
  const instanceId = useLaxInstanceData()?.id;

  return useMutation({
    mutationFn: ({ dataGuid, tagToAdd }: { dataGuid: string; tagToAdd: string }) => {
      if (!instanceId) {
        throw new Error('Missing instanceId, cannot add attachment');
      }

      return doAttachmentAddTag(instanceId, dataGuid, tagToAdd);
    },
    onError: (error: AxiosError) => {
      window.logError('Failed to add tag to attachment:\n', error);
    },
  });
}

function useAttachmentsRemoveTagMutation() {
  const { doAttachmentRemoveTag } = useAppMutations();
  const instanceId = useLaxInstanceData()?.id;

  return useMutation({
    mutationFn: ({ dataGuid, tagToRemove }: { dataGuid: string; tagToRemove: string }) => {
      if (!instanceId) {
        throw new Error('Missing instanceId, cannot remove attachment');
      }

      return doAttachmentRemoveTag(instanceId, dataGuid, tagToRemove);
    },
    onError: (error: AxiosError) => {
      window.logError('Failed to remove tag from attachment:\n', error);
    },
  });
}

function useAttachmentsRemoveMutation() {
  const { doAttachmentRemove } = useAppMutations();
  const instanceId = useLaxInstanceData()?.id;
  const language = useCurrentLanguage();

  return useMutation({
    mutationFn: (dataGuid: string) => {
      if (!instanceId) {
        throw new Error('Missing instanceId, cannot remove attachment');
      }

      return doAttachmentRemove(instanceId, dataGuid, language);
    },
    onError: (error: AxiosError) => {
      window.logError('Failed to delete attachment:\n', error);
    },
  });
}
