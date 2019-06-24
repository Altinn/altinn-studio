import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IAttachments } from '.';
import * as AttachmentActionsTypes from './attachmentActionTypes';
import * as deleteActions from './delete/deleteAttachmentActions';
import * as fetchActions from './fetch/fetchAttachmentsActions';
import * as uploadActions from './upload/uploadAttachmentActions';

export interface IAttachmentState {
  attachments: IAttachments;
}

const initialState: IAttachmentState = {
  attachments: {},
};

const attachmentReducer: Reducer<IAttachmentState> = (
  state: IAttachmentState = initialState,
  action?: Action,
): IAttachmentState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case (AttachmentActionsTypes.UPLOAD_ATTACHMENT): {
      const { file, attachmentType, tmpAttachmentId }
        = action as uploadActions.IUploadAttachmentAction;
      if (!state.attachments[attachmentType]) {
        state = update<IAttachmentState>(state, {
          attachments: {
            [attachmentType]: { $set: [] },
          },
        });
      }
      return update<IAttachmentState>(state, {
        attachments: {
          [attachmentType]: {
            $push: [{ name: file.name, size: file.size, uploaded: false, id: tmpAttachmentId, deleting: false }],
          },
        },
      });
    }

    case (AttachmentActionsTypes.UPLOAD_ATTACHMENT_REJECTED): {
      const { attachmentType, attachmentId } =
        action as uploadActions.IUploadAttachmentActionRejected;
      return update<IAttachmentState>(state, {
        attachments: {
          [attachmentType]: {
            $set: state.attachments[attachmentType].filter((attachment) => attachment.id !== attachmentId),
          },
        },
      });
    }

    case (AttachmentActionsTypes.UPLOAD_ATTACHMENT_FULFILLED): {
      const { attachment, attachmentType, tmpAttachmentId } =
        action as uploadActions.IUploadAttachmentActionFulfilled;
      const index = state.attachments[attachmentType].findIndex((item) => item.id === tmpAttachmentId);
      if (index < 0) {
        return state;
      }
      return update<IAttachmentState>(state, {
        attachments: {
          [attachmentType]: {
            [index]: { $set: attachment },
          },
        },
      });
    }

    case (AttachmentActionsTypes.DELETE_ATTACHMENT_FULFILLED): {
      const { attachmentId: id, attachmentType } = action as deleteActions.IDeleteAttachmentActionFulfilled;
      return update<IAttachmentState>(state, {
        attachments: {
          [attachmentType]: {
            $set: state.attachments[attachmentType].filter((attachment) => attachment.id !== id),
          },
        },
      });
    }

    case (AttachmentActionsTypes.DELETE_ATTACHMENT_REJECTED): {
      const { attachment, attachmentType } =
        action as deleteActions.IDeleteAttachmentActionRejected;
      const newAttachment = { ...attachment, deleting: false };
      const index = state.attachments[attachmentType].findIndex((element) => element.id === attachment.id);
      if (index < 0) {
        return state;
      }
      return update<IAttachmentState>(state, {
        attachments: {
          [attachmentType]: {
            [index]: { $set: newAttachment },
          },
        },
      });
    }

    case (AttachmentActionsTypes.FETCH_ATTACHMENTS_FULFILLED): {
      const { attachments } = action as fetchActions.IFetchAttachmentsActionFulfilled;
      return update<IAttachmentState>(state, {
        attachments: {
          $set: attachments,
        },
      });
    }
    default:
      return state;
  }
};

export default attachmentReducer;
