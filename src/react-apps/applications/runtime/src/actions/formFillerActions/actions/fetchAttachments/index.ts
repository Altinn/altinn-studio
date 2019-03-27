import { Action } from 'redux';
import * as ActionTypes from '../../formFillerActionTypes';

export interface IFetchAttachmentsActionFulfilled extends Action {
  attachments: IAttachments;
}

export interface IFetchAttachmentsActionRejected extends Action {
  error: Error;
}

export function fetchAttachments(
): Action {
  return {
    type: ActionTypes.FETCH_ATTACHMENTS,
  };
}

export function fetchAttachmentsFulfilled(
  attachments: IAttachments,
): IFetchAttachmentsActionFulfilled {
  return {
    type: ActionTypes.FETCH_ATTACHMENTS_FULFILLED,
    attachments,
  };
}

export function fetchAttachmentsRejected(
  error: Error,
): IFetchAttachmentsActionRejected {
  return {
    type: ActionTypes.FETCH_ATTACHMENTS_REJECTED,
    error,
  };
}
