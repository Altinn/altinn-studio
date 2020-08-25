import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IAttachments } from '.';
import * as AttachmentActionsTypes from './attachmentActionTypes';
import * as mapActions from './map/mapAttachmentsActions';

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
    case (AttachmentActionsTypes.MAP_ATTACHMENTS_FULFILLED): {
      const { attachments } = action as mapActions.IMapAttachmentsActionFulfilled;
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
