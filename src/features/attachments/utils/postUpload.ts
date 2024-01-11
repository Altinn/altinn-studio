import { useEffect } from 'react';
import { toast } from 'react-toastify';
import type React from 'react';

import { useMutation } from '@tanstack/react-query';
import { useImmerReducer } from 'use-immer';
import type { AxiosError } from 'axios';
import type { ImmerReducer } from 'use-immer';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { useMappedAttachments } from 'src/features/attachments/utils/mapping';
import { useLaxInstance, useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { useLanguage } from 'src/features/language/useLanguage';
import type {
  AttachmentActionRemove,
  AttachmentActionUpdate,
  IAttachments,
  RawAttachmentAction,
  UploadedAttachment,
} from 'src/features/attachments';
import type { SimpleAttachments } from 'src/features/attachments/utils/mapping';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

type Update = AttachmentActionUpdate & { success: undefined };
type UpdateFulfilled = AttachmentActionUpdate & { success: true };
type UpdateRejected = AttachmentActionUpdate & { success: false; error: AxiosError };

type Remove = AttachmentActionRemove & { success: undefined };
type RemoveFulfilled = AttachmentActionRemove & { success: true };
type RemoveRejected = AttachmentActionRemove & { success: false; error: AxiosError };

type ActionReplaceAll = { action: 'replaceAll'; attachments: SimpleAttachments };

type Actions = Update | UpdateFulfilled | UpdateRejected | Remove | RemoveFulfilled | RemoveRejected | ActionReplaceAll;
type Dispatch = React.Dispatch<Actions>;

const reducer: ImmerReducer<IAttachments<UploadedAttachment>, Actions> = (draft, action) => {
  if (action.action === 'replaceAll') {
    const { attachments } = action;
    const out: IAttachments<UploadedAttachment> = {};

    for (const nodeId in attachments) {
      for (const attachment of attachments[nodeId]!) {
        out[nodeId] = out[nodeId] || [];
        out[nodeId]?.push({
          uploaded: true,
          updating: false,
          deleting: false,
          data: attachment,
        });
      }
    }

    return out;
  }
  if (action.action === 'update' && action.success === undefined) {
    const { tags, attachment, node } = action;

    const attachments = draft[node.item.id];
    if (attachments) {
      const index = attachments.findIndex((a) => a.data.id === attachment.data.id);
      if (index !== -1) {
        attachments[index].updating = true;
        attachments[index].data.tags = tags;
      }
    }
    return draft;
  }
  if (action.action === 'update' && action.success) {
    const { attachment, node } = action;

    const attachments = draft[node.item.id];
    if (attachments) {
      const index = attachments.findIndex((a) => a.data.id === attachment.data.id);
      if (index !== -1) {
        attachments[index].updating = false;
      }
    }
    return draft;
  }
  if (action.action === 'update' && !action.success) {
    const { attachment, node, error } = action;

    const attachments = draft[node.item.id];
    if (attachments) {
      const index = attachments.findIndex((a) => a.data.id === attachment.data.id);
      if (index !== -1) {
        attachments[index].updating = false;
        attachments[index].error = error;
      }
    }
    return draft;
  }
  if (action.action === 'remove' && action.success === undefined) {
    const { attachment, node } = action;

    const attachments = draft[node.item.id];
    if (attachments) {
      const index = attachments.findIndex((a) => a.data.id === attachment.data.id);
      if (index !== -1) {
        attachments[index].deleting = true;
      }
    }
    return draft;
  }
  if (action.action === 'remove' && action.success) {
    const { attachment, node } = action;

    const attachments = draft[node.item.id];
    if (attachments) {
      const index = attachments.findIndex((a) => a.data.id === attachment.data.id);
      if (index !== -1) {
        attachments.splice(index, 1);
      }
    }
    return draft;
  }
  if (action.action === 'remove' && !action.success) {
    const { attachment, node, error } = action;

    const attachments = draft[node.item.id];
    if (attachments) {
      const index = attachments.findIndex((a) => a.data.id === attachment.data.id);
      if (index !== -1) {
        attachments[index].deleting = false;
        attachments[index].error = error;
      }
    }
    return draft;
  }

  throw new Error('Invalid action');
};

const initialState: IAttachments<UploadedAttachment> = {};

export const usePostUpload = () => {
  const fromInstance = useMappedAttachments();

  const [state, dispatch] = useImmerReducer(reducer, initialState);
  const update = useUpdate(dispatch);
  const remove = useRemove(dispatch);

  useEffect(() => {
    dispatch({ action: 'replaceAll', attachments: fromInstance || {} });
  }, [dispatch, fromInstance]);

  return {
    state,
    update,
    remove,
  };
};

const useUpdate = (dispatch: Dispatch) => {
  const { mutateAsync: removeTag } = useAttachmentsRemoveTagMutation();
  const { mutateAsync: addTag } = useAttachmentsAddTagMutation();
  const { changeData: changeInstanceData } = useLaxInstance() || {};
  const { lang } = useLanguage();

  return async (action: RawAttachmentAction<AttachmentActionUpdate>) => {
    const { tags, attachment } = action;
    const tagToAdd = tags.filter((t) => !attachment.data.tags?.includes(t));
    const tagToRemove = attachment.data.tags?.filter((t) => !tags.includes(t)) || [];
    const areEqual = tagToAdd.length && tagToRemove.length && tagToAdd[0] === tagToRemove[0];

    // If there are no tags to add or remove, or if the tags are the same, do nothing.
    if ((!tagToAdd.length && !tagToRemove.length) || areEqual) {
      return;
    }

    dispatch({ ...action, action: 'update', success: undefined });
    try {
      if (tagToAdd.length) {
        await Promise.all(tagToAdd.map((tag) => addTag({ dataGuid: attachment.data.id, tagToAdd: tag })));
      }
      if (tagToRemove.length) {
        await Promise.all(tagToRemove.map((tag) => removeTag({ dataGuid: attachment.data.id, tagToRemove: tag })));
      }
      dispatch({ ...action, action: 'update', success: true });

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
      dispatch({ ...action, action: 'update', success: false, error });
      toast(lang('form_filler.file_uploader_validation_error_update'), { type: 'error' });
    }
  };
};

const useRemove = (dispatch: Dispatch) => {
  const { mutateAsync: removeAttachment } = useAttachmentsRemoveMutation();
  const { changeData: changeInstanceData } = useLaxInstance() || {};
  const { lang } = useLanguage();

  return async (action: RawAttachmentAction<AttachmentActionRemove>) => {
    dispatch({ ...action, action: 'remove', success: undefined });
    try {
      await removeAttachment(action.attachment.data.id);
      dispatch({ ...action, action: 'remove', success: true });

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
      dispatch({ ...action, action: 'remove', success: false, error });
      toast(lang('form_filler.file_uploader_validation_error_delete'), { type: 'error' });
      return false;
    }
  };
};

function useAttachmentsAddTagMutation() {
  const { doAttachmentAddTag } = useAppMutations();
  const instanceId = useLaxInstanceData()?.id;

  return useMutation({
    mutationFn: ({ dataGuid, tagToAdd }: { dataGuid: string; tagToAdd: string }) => {
      if (!instanceId) {
        throw new Error('Missing instanceId, cannot add attachment');
      }

      return doAttachmentAddTag.call(instanceId, dataGuid, tagToAdd);
    },
    onError: (error: HttpClientError) => {
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

      return doAttachmentRemoveTag.call(instanceId, dataGuid, tagToRemove);
    },
    onError: (error: HttpClientError) => {
      window.logError('Failed to remove tag from attachment:\n', error);
    },
  });
}

function useAttachmentsRemoveMutation() {
  const { doAttachmentRemove } = useAppMutations();
  const instanceId = useLaxInstanceData()?.id;

  return useMutation({
    mutationFn: (dataGuid: string) => {
      if (!instanceId) {
        throw new Error('Missing instanceId, cannot remove attachment');
      }

      return doAttachmentRemove.call(instanceId, dataGuid);
    },
    onError: (error: HttpClientError) => {
      window.logError('Failed to delete attachment:\n', error);
    },
  });
}
