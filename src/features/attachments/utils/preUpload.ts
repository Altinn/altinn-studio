import { useCallback } from 'react';
import type React from 'react';

import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useImmerReducer } from 'use-immer';
import { v4 as uuidv4 } from 'uuid';
import type { UseMutationOptions } from '@tanstack/react-query';
import type { ImmerReducer } from 'use-immer';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { useLaxInstance } from 'src/features/instance/InstanceContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { ValidationActions } from 'src/features/validation/validationSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useWaitForState } from 'src/hooks/useWaitForState';
import { getFileUploadComponentValidations } from 'src/utils/formComponentUtils';
import { getValidationMessage } from 'src/utils/validation/backendValidation';
import { BackendValidationSeverity } from 'src/utils/validation/backendValidationSeverity';
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
import type { BackendValidationIssue, IComponentValidations } from 'src/utils/validation/types';

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
  const waitFor = useWaitForState<IData | false, State>({
    cacheKey: ['attachments', 'preUpload'],
    currentState: state,
  });

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
  const langTools = useLanguage();
  const reduxDispatch = useAppDispatch();
  const backendFeatures = useAppSelector((state) => state.applicationMetadata.applicationMetadata?.features) || {};

  return async (action: RawAttachmentAction<AttachmentActionUpload>) => {
    const { node, file } = action;
    const temporaryId = uuidv4();
    dispatch({ ...action, temporaryId, action: 'upload' });

    // Sets validations to empty.
    const newValidations = getFileUploadComponentValidations(null, langTools);
    reduxDispatch(
      ValidationActions.updateComponentValidations({
        componentId: node.item.id,
        pageKey: node.top.top.myKey,
        validationResult: { validations: newValidations },
      }),
    );

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

      let validations: IComponentValidations;
      if (backendFeatures.jsonObjectInDataResponse && isAxiosError(err) && err.response?.data) {
        const validationIssues: BackendValidationIssue[] = err.response.data;

        validations = {
          simpleBinding: {
            errors: validationIssues
              .filter((v) => v.severity === BackendValidationSeverity.Error)
              .map((v) => getValidationMessage(v, langTools)),
            warnings: validationIssues
              .filter((v) => v.severity === BackendValidationSeverity.Warning)
              .map((v) => getValidationMessage(v, langTools)),
          },
        };
      } else {
        validations = getFileUploadComponentValidations('upload', langTools);
      }

      reduxDispatch(
        ValidationActions.updateComponentValidations({
          componentId: node.item.id,
          pageKey: node.top.top.myKey,
          validationResult: { validations },
        }),
      );
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

  const options: UseMutationOptions<IData, HttpClientError, MutationVariables> = {
    mutationFn: ({ dataTypeId, file }: MutationVariables) => doAttachmentUpload.call(dataTypeId, file),
    onError: (error: HttpClientError) => {
      window.logError('Failed to upload attachment:\n', error.message);
    },
  };

  return useMutation(options);
}
