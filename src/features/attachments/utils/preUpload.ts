import { useCallback } from 'react';
import { toast } from 'react-toastify';
import type React from 'react';

import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useImmerReducer } from 'use-immer';
import { v4 as uuidv4 } from 'uuid';
import type { UseMutationOptions } from '@tanstack/react-query';
import type { ImmerReducer } from 'use-immer';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useLaxInstance, useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { type BackendValidationIssue } from 'src/features/validation';
import { getValidationIssueMessage } from 'src/features/validation/backend/backendUtils';
import { useAsRef } from 'src/hooks/useAsRef';
import { useWaitForState } from 'src/hooks/useWaitForState';
import type {
  AttachmentActionUpload,
  IAttachment,
  IAttachments,
  RawAttachmentAction,
  TemporaryAttachment,
} from 'src/features/attachments';
import type { IData } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

interface ActionUpload extends AttachmentActionUpload {
  temporaryId: string;
}

interface ActionRemove {
  action: 'remove';
  node: LayoutNode<'FileUploadWithTag' | 'FileUpload'>;
  temporaryId: string;
  result: IData | false;
}

type Actions = ActionUpload | ActionRemove;

interface State {
  uploading: IAttachments<TemporaryAttachment>;
  uploadedResults: {
    [temporaryId: string]: IData | undefined;
  };
  failedTmpIds: string[];
}

const reducer: ImmerReducer<State, Actions> = (draft, action) => {
  const { node, temporaryId } = action;
  const { id } = node.item;

  if (action.action === 'upload') {
    const { file } = action;
    draft.uploading[id] = draft.uploading[id] || [];
    (draft.uploading[id] as IAttachment[]).push({
      uploaded: false,
      updating: false,
      deleting: false,
      data: {
        temporaryId,
        filename: file.name,
        size: file.size,
      },
    });
  } else if (action.action === 'remove') {
    const attachments = draft.uploading[id];
    if (attachments) {
      const index = attachments.findIndex((a) => a.data.temporaryId === temporaryId);
      if (index !== -1) {
        attachments.splice(index, 1);
      }
    }
    if (action.result) {
      draft.uploadedResults[temporaryId] = action.result;
    } else {
      draft.failedTmpIds.push(temporaryId);
    }
  }
};

type Dispatch = React.Dispatch<Actions>;
const initialState: State = {
  uploading: {},
  uploadedResults: {},
  failedTmpIds: [],
};
export const usePreUpload = () => {
  const [state, dispatch] = useImmerReducer(reducer, initialState);
  const upload = useUpload(dispatch);
  const stateRef = useAsRef(state);
  const waitFor = useWaitForState<IData | false, State>(stateRef);

  const awaitUpload = useCallback(
    (attachment: TemporaryAttachment) =>
      waitFor((s, setRetVal) => {
        const { uploadedResults, failedTmpIds } = s;
        const { temporaryId } = attachment.data;
        const result = uploadedResults[temporaryId];
        if (result) {
          setRetVal(result);
          return true;
        }
        if (failedTmpIds.includes(temporaryId)) {
          setRetVal(false);
          return true;
        }
        return false;
      }),
    [waitFor],
  );

  return { state: state.uploading, upload, awaitUpload };
};

/**
 * Do not use this directly, use the `useAttachmentsUploader` hook instead.
 * @see useAttachmentsUploader
 */
const useUpload = (dispatch: Dispatch) => {
  const { changeData: changeInstanceData } = useLaxInstance() || {};
  const { mutateAsync } = useAttachmentsUploadMutation();
  const { langAsString, lang } = useLanguage();
  const backendFeatures = useApplicationMetadata().features || {};

  return async (action: RawAttachmentAction<AttachmentActionUpload>) => {
    const { node, file } = action;
    const temporaryId = uuidv4();
    dispatch({ ...action, temporaryId, action: 'upload' });

    try {
      const reply = await mutateAsync({
        dataTypeId: node.item.baseComponentId || node.item.id,
        file,
      });
      if (!reply || !reply.blobStoragePath) {
        throw new Error('Failed to upload attachment');
      }

      dispatch({ action: 'remove', node, temporaryId, result: reply });
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
      dispatch({ action: 'remove', node, temporaryId, result: false });

      if (backendFeatures.jsonObjectInDataResponse && isAxiosError(err) && err.response?.data) {
        const validationIssues: BackendValidationIssue[] = err.response.data;
        const message = validationIssues
          .map((issue) => getValidationIssueMessage(issue))
          .map(({ key, params }) => `- ${langAsString(key, params)}`)
          .join('\n');
        toast(message, { type: 'error' });
      } else {
        toast(lang('form_filler.file_uploader_validation_error_upload'), { type: 'error' });
      }
    }

    return undefined;
  };
};

interface MutationVariables {
  dataTypeId: string;
  file: File;
}

function useAttachmentsUploadMutation() {
  const { doAttachmentUpload } = useAppMutations();
  const instanceId = useLaxInstanceData()?.id;

  const options: UseMutationOptions<IData, HttpClientError, MutationVariables> = {
    mutationFn: ({ dataTypeId, file }: MutationVariables) => {
      if (!instanceId) {
        throw new Error('Missing instanceId, cannot upload attachment');
      }

      return doAttachmentUpload(instanceId, dataTypeId, file);
    },
    onError: (error: HttpClientError) => {
      window.logError('Failed to upload attachment:\n', error.message);
    },
  };

  return useMutation(options);
}
