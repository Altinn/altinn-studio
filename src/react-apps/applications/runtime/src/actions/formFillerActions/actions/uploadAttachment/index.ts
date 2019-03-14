import { Action } from 'redux';
import * as ActionTypes from '../../formFillerActionTypes';

export interface IUploadAttachmentAction extends Action {
  file: File;
}

export interface IUploadAttachmentActionFulfilled extends Action {
  attachment: IAttachment;
}

export interface IUploadAttachmentActionRejected extends Action {
  error: Error;
}

export function uploadAttachment(
  file: File,
): IUploadAttachmentAction {
  return {
    type: ActionTypes.UPLOAD_ATTACHMENT,
    file,
  };
}

export function uploadAttachmentFulfilled(
  attachment: IAttachment,
): IUploadAttachmentActionFulfilled {
  return {
    type: ActionTypes.UPLOAD_ATTACHMENT_FULFILLED,
    attachment,
  };
}

export function uploadAttachmentRejected(
  error: Error,
): IUploadAttachmentActionRejected {
  return {
    type: ActionTypes.UPLOAD_ATTACHMENT_REJECTED,
    error,
  };
}
