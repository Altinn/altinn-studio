import update from 'immutability-helper';
import type { Action, Reducer } from 'redux';
import type { IAttachments } from '.';
import * as AttachmentActionsTypes from './attachmentActionTypes';
import type * as deleteActions from './delete/deleteAttachmentActions';
import type * as mapActions from './map/mapAttachmentsActions';
import type * as uploadActions from './upload/uploadAttachmentActions';
import type * as updateActions from './update/updateAttachmentActions';

export interface IAttachmentState {
  attachments: IAttachments;
  error?: Error;
}

const initialState: IAttachmentState = {
  attachments: {},
  error: undefined,
};

const attachmentReducer: Reducer<IAttachmentState> = (
  state: IAttachmentState = initialState,
  action?: Action,
): IAttachmentState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case AttachmentActionsTypes.UPLOAD_ATTACHMENT: {
      const { file, componentId, tmpAttachmentId } =
        action as uploadActions.IUploadAttachmentAction;
      if (!state.attachments[componentId]) {
        state = update<IAttachmentState>(state, {
          attachments: {
            [componentId]: { $set: [] },
          },
        });
      }
      return update<IAttachmentState>(state, {
        attachments: {
          [componentId]: {
            $push: [
              {
                name: file.name,
                size: file.size,
                uploaded: false,
                id: tmpAttachmentId,
                tags: [],
                deleting: false,
              },
            ],
          },
        },
      });
    }

    case AttachmentActionsTypes.UPLOAD_ATTACHMENT_REJECTED: {
      const { componentId, attachmentId } =
        action as uploadActions.IUploadAttachmentActionRejected;
      return update<IAttachmentState>(state, {
        attachments: {
          [componentId]: {
            $set: state.attachments[componentId].filter(
              (attachment) => attachment.id !== attachmentId,
            ),
          },
        },
      });
    }

    case AttachmentActionsTypes.UPLOAD_ATTACHMENT_FULFILLED: {
      const { attachment, componentId, tmpAttachmentId } =
        action as uploadActions.IUploadAttachmentActionFulfilled;
      const index = state.attachments[componentId].findIndex(
        (item) => item.id === tmpAttachmentId,
      );
      if (index < 0) {
        return state;
      }
      return update<IAttachmentState>(state, {
        attachments: {
          [componentId]: {
            [index]: { $set: attachment },
          },
        },
      });
    }

    case AttachmentActionsTypes.UPDATE_ATTACHMENT: {
      const { attachment, componentId } =
        action as updateActions.IUpdateAttachmentAction;
      if (!state.attachments[componentId]) {
        state = update<IAttachmentState>(state, {
          attachments: {
            [componentId]: { $set: [] },
          },
        });
      }
      const newAttachment = { ...attachment, updating: true };
      const index = state.attachments[componentId].findIndex(
        (item) => item.id === attachment.id,
      );
      return update<IAttachmentState>(state, {
        attachments: {
          [componentId]: {
            [index]: { $set: newAttachment },
          },
        },
      });
    }

    case AttachmentActionsTypes.UPDATE_ATTACHMENT_REJECTED: {
      const { attachment, componentId, tag } =
        action as updateActions.IUpdateAttachmentActionRejected;
      const newAttachment = {
        ...attachment,
        tag,
        updating: false,
      };
      const index = state.attachments[componentId].findIndex(
        (item) => item.id === attachment.id,
      );
      return update<IAttachmentState>(state, {
        attachments: {
          [componentId]: {
            [index]: { $set: newAttachment },
          },
        },
      });
    }

    case AttachmentActionsTypes.UPDATE_ATTACHMENT_FULFILLED: {
      const { attachment, componentId } =
        action as updateActions.IUpdateAttachmentActionFulfilled;
      const newAttachment = { ...attachment, updating: false };
      const index = state.attachments[componentId].findIndex(
        (item) => item.id === attachment.id,
      );
      return update<IAttachmentState>(state, {
        attachments: {
          [componentId]: {
            [index]: { $set: newAttachment },
          },
        },
      });
    }

    case AttachmentActionsTypes.DELETE_ATTACHMENT: {
      const { attachment, componentId } =
        action as deleteActions.IDeleteAttachmentAction;
      const index = state.attachments[componentId].findIndex(
        (element) => element.id === attachment.id,
      );
      if (index < 0) {
        return state;
      }
      return update<IAttachmentState>(state, {
        attachments: {
          [componentId]: {
            [index]: { deleting: { $set: true } },
          },
        },
      });
    }

    case AttachmentActionsTypes.DELETE_ATTACHMENT_FULFILLED: {
      const { attachmentId: id, componentId } =
        action as deleteActions.IDeleteAttachmentActionFulfilled;
      return update<IAttachmentState>(state, {
        attachments: {
          [componentId]: {
            $set: state.attachments[componentId].filter(
              (attachment) => attachment.id !== id,
            ),
          },
        },
      });
    }

    case AttachmentActionsTypes.DELETE_ATTACHMENT_REJECTED: {
      const { attachment, componentId } =
        action as deleteActions.IDeleteAttachmentActionRejected;
      const newAttachment = { ...attachment, deleting: false };
      const index = state.attachments[componentId].findIndex(
        (element) => element.id === attachment.id,
      );
      if (index < 0) {
        return state;
      }
      return update<IAttachmentState>(state, {
        attachments: {
          [componentId]: {
            [index]: { $set: newAttachment },
          },
        },
      });
    }

    case AttachmentActionsTypes.MAP_ATTACHMENTS_FULFILLED: {
      const { attachments } =
        action as mapActions.IMapAttachmentsActionFulfilled;
      return update<IAttachmentState>(state, {
        attachments: {
          $set: attachments,
        },
      });
    }

    case AttachmentActionsTypes.MAP_ATTACHMENTS_REJECTED: {
      const { error } = action as mapActions.IMapAttachmentsActionRejected;
      return update<IAttachmentState>(state, {
        error: {
          $set: error,
        },
      });
    }

    default:
      return state;
  }
};

export default attachmentReducer;
