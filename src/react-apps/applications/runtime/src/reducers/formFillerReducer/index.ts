import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as FormFillerActions from '../../actions/formFillerActions/actions';
import * as FormFillerActionTypes from '../../actions/formFillerActions/formFillerActionTypes';

export interface IFormFillerState {
  formData: any;
  validationResults: IValidationResults;
  unsavedChanges: boolean;
  apiResult?: any;
  attachments: IAttachments;
}

const initialState: IFormFillerState = {
  formData: {},
  validationResults: {},
  unsavedChanges: false,
  attachments: {},
};

const formFillerReducer: Reducer<IFormFillerState> = (
  state: IFormFillerState = initialState,
  action?: Action,
): IFormFillerState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case FormFillerActionTypes.UPDATE_VALIDATION_ERRORS:
    case FormFillerActionTypes.RUN_SINGLE_FIELD_VALIDATION_FULFILLED: {
      const {
        validationResults,
      } = action as FormFillerActions.IUpdateValidationResults;
      return update<IFormFillerState>(state, {
        $apply: () => ({
          ...state,
          validationResults,
        }),
      });
    }

    case FormFillerActionTypes.UPDATE_FORM_DATA_FULFILLED: {
      const {
        formData,
        componentID,
        dataModelBinding,
        validationResults,
      } = action as FormFillerActions.IUpdateFormDataActionFulfilled;
      if (validationResults && Object.keys(validationResults).length > 0) {
        return update<IFormFillerState>(state, {
          formData: {
            $apply: () => ({
              ...state.formData,
              [dataModelBinding]: formData,
            }),
          },
          validationResults: {
            [componentID]: {
              $set: validationResults,
            },
          },
          unsavedChanges: {
            $set: true,
          },
        });
      }

      return update<IFormFillerState>(state, {
        formData: {
          $apply: () => ({
            ...state.formData,
            [dataModelBinding]: formData,
          }),
        },
        validationResults: {
          $unset: [componentID],
        },
        unsavedChanges: {
          $set: true,
        },
      });
    }

    case (FormFillerActionTypes.FETCH_FORM_DATA_FULFILLED): {
      const { formData } = action as FormFillerActions.IFetchFormDataActionFulfilled;
      return update<IFormFillerState>(state, {
        formData: {
          $set: formData,
        },
        unsavedChanges: {
          $set: false,
        },
      });
    }

    case (FormFillerActionTypes.SUBMIT_FORM_DATA_FULFILLED): {
      const { apiResult } = action as FormFillerActions.ISubmitFormDataActionFulfilled;
      return update<IFormFillerState>(state, {
        unsavedChanges: {
          $set: false,
        },
        apiResult: {
          $set: apiResult,
        },
        validationResults: {
          $set: {},
        },
      });
    }

    case (FormFillerActionTypes.UPLOAD_ATTACHMENT): {
      const { file, attachmentType, tmpAttachmentId, componentId }
        = action as FormFillerActions.IUploadAttachmentAction;
      if (!state.attachments[attachmentType]) {
        state = update<IFormFillerState>(state, {
          attachments: {
            [attachmentType]: { $set: [] },
          },
        });
      }
      return update<IFormFillerState>(state, {
        attachments: {
          [attachmentType]: {
            $push: [{ name: file.name, size: file.size, uploaded: false, id: tmpAttachmentId }],
          },
        },
        validationResults: {
          [componentId]: {
            $set: {},
          },
        },
      });
    }

    case (FormFillerActionTypes.UPLOAD_ATTACHMENT_REJECTED): {
      const { attachmentType, attachmentId, componentId, validationMessages } =
        action as FormFillerActions.IUploadAttachmentActionRejected;
      return update<IFormFillerState>(state, {
        attachments: {
          [attachmentType]: {
            $set: state.attachments[attachmentType].filter((attachment) => attachment.id !== attachmentId),
          },
        },
        validationResults: {
          [componentId]: {
            $set: validationMessages,
          },
        },
      });
    }

    case (FormFillerActionTypes.UPLOAD_ATTACHMENT_FULFILLED): {
      const { attachment, attachmentType, tmpAttachmentId } =
        action as FormFillerActions.IUploadAttachmentActionFulfilled;
      const index = state.attachments[attachmentType].findIndex((item) => item.id === tmpAttachmentId);
      if (index < 0) {
        return state;
      }
      return update<IFormFillerState>(state, {
        attachments: {
          [attachmentType]: {
            [index]: { $set: attachment },
          },
        },
      });
    }

    case (FormFillerActionTypes.DELETE_ATTACHMENT_FULFILLED): {
      const { attachmentId: id, attachmentType } = action as FormFillerActions.IDeleteAttachmentActionFulfilled;
      return update<IFormFillerState>(state, {
        attachments: {
          [attachmentType]: {
            $set: state.attachments[attachmentType].filter((attachment) => attachment.id !== id),
          },
        },
      });
    }

    case (FormFillerActionTypes.DELETE_ATTACHMENT_REJECTED): {
      const { attachment, attachmentType, componentId, validationMessages } =
        action as FormFillerActions.IDeleteAttachmentActionRejected;
      const newAttachment = { ...attachment, deleting: false };
      const index = state.attachments[attachmentType].findIndex((element) => element.id === attachment.id);
      if (index < 0) {
        return state;
      }
      return update<IFormFillerState>(state, {
        attachments: {
          [attachmentType]: {
            [index]: { $set: newAttachment },
          },
        },
        validationResults: {
          [componentId]: {
            $set: validationMessages,
          },
        },
      });
    }

    case (FormFillerActionTypes.FETCH_ATTACHMENTS_FULFILLED): {
      const { attachments } = action as FormFillerActions.IFetchAttachmentsActionFulfilled;
      return update<IFormFillerState>(state, {
        attachments: {
          $set: attachments,
        },
      });
    }

    default:
      return state;
  }
};

export default formFillerReducer;
