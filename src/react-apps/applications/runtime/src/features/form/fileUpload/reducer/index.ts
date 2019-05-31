import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IAttachments } from '..';
import * as deleteActions from '../actions/delete';
import * as fetchActions from '../actions/fetch';
import * as FileUploadActionsTypes from '../actions/types';
import * as uploadActions from '../actions/upload';

export interface IFormFileUploadState {
  attachments: IAttachments;
}

const initialState: IFormFileUploadState = {
  attachments: {},
};

const formFileUploadReducer: Reducer<IFormFileUploadState> = (
  state: IFormFileUploadState = initialState,
  action?: Action,
): IFormFileUploadState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case (FileUploadActionsTypes.UPLOAD_ATTACHMENT): {
      const { file, attachmentType, tmpAttachmentId }
        = action as uploadActions.IUploadAttachmentAction;
      if (!state.attachments[attachmentType]) {
        state = update<IFormFileUploadState>(state, {
          attachments: {
            [attachmentType]: { $set: [] },
          },
        });
      }
      return update<IFormFileUploadState>(state, {
        attachments: {
          [attachmentType]: {
            $push: [{ name: file.name, size: file.size, uploaded: false, id: tmpAttachmentId, deleting: false }],
          },
        },
      });
    }

    case (FileUploadActionsTypes.UPLOAD_ATTACHMENT_REJECTED): {
      const { attachmentType, attachmentId } =
        action as uploadActions.IUploadAttachmentActionRejected;
      return update<IFormFileUploadState>(state, {
        attachments: {
          [attachmentType]: {
            $set: state.attachments[attachmentType].filter((attachment) => attachment.id !== attachmentId),
          },
        },
      });
    }

    case (FileUploadActionsTypes.UPLOAD_ATTACHMENT_FULFILLED): {
      const { attachment, attachmentType, tmpAttachmentId } =
        action as uploadActions.IUploadAttachmentActionFulfilled;
      const index = state.attachments[attachmentType].findIndex((item) => item.id === tmpAttachmentId);
      if (index < 0) {
        return state;
      }
      return update<IFormFileUploadState>(state, {
        attachments: {
          [attachmentType]: {
            [index]: { $set: attachment },
          },
        },
      });
    }

    case (FileUploadActionsTypes.DELETE_ATTACHMENT_FULFILLED): {
      const { attachmentId: id, attachmentType } = action as deleteActions.IDeleteAttachmentActionFulfilled;
      return update<IFormFileUploadState>(state, {
        attachments: {
          [attachmentType]: {
            $set: state.attachments[attachmentType].filter((attachment) => attachment.id !== id),
          },
        },
      });
    }

    case (FileUploadActionsTypes.DELETE_ATTACHMENT_REJECTED): {
      const { attachment, attachmentType } =
        action as deleteActions.IDeleteAttachmentActionRejected;
      const newAttachment = { ...attachment, deleting: false };
      const index = state.attachments[attachmentType].findIndex((element) => element.id === attachment.id);
      if (index < 0) {
        return state;
      }
      return update<IFormFileUploadState>(state, {
        attachments: {
          [attachmentType]: {
            [index]: { $set: newAttachment },
          },
        },
      });
    }

    case (FileUploadActionsTypes.FETCH_ATTACHMENTS_FULFILLED): {
      const { attachments } = action as fetchActions.IFetchAttachmentsActionFulfilled;
      return update<IFormFileUploadState>(state, {
        attachments: {
          $set: attachments,
        },
      });
    }
    default:
      return state;
  }
};

export default formFileUploadReducer;
