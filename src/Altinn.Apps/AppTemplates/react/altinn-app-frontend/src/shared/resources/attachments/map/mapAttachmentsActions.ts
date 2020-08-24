
import { Action } from 'redux';
import { IAttachments } from '..';
import * as ActionTypes from '../attachmentActionTypes';

export interface IMapAttachmentsActionFulfilled extends Action {
  attachments: IAttachments;
}

export interface IMapAttachmentsActionRejected extends Action {
  error: Error;
}

export function mapAttachments(
): Action {
  return {
    type: ActionTypes.MAP_ATTACHMENTS,
  };
}

export function mapAttachmentsFulfilled(
  attachments: IAttachments,
): IMapAttachmentsActionFulfilled {
  return {
    type: ActionTypes.MAP_ATTACHMENTS_FULFILLED,
    attachments,
  };
}

export function mapAttachmentsRejected(
  error: Error,
): IMapAttachmentsActionRejected {
  return {
    type: ActionTypes.MAP_ATTACHMENTS_REJECTED,
    error,
  };
}
