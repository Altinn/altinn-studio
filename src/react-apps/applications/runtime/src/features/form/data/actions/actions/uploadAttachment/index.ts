import { Action } from 'redux';
import { IAttachment } from 'src/features/form/fileUpload';
import { IComponentValidations } from 'src/types/global';
import * as ActionTypes from '../../types';

export interface IUploadAttachmentAction extends Action {
  file: File;
  attachmentType: string;
  tmpAttachmentId: string;
  componentId: string;
}

export interface IUploadAttachmentActionFulfilled extends Action {
  attachment: IAttachment;
  attachmentType: string;
  tmpAttachmentId: string;
  componentId: string;
}

export interface IUploadAttachmentActionRejected extends Action {
  attachmentId: string;
  attachmentType: string;
  componentId: string;
  validationMessages: IComponentValidations;
}

export function uploadAttachment(
  file: File,
  attachmentType: string,
  tmpAttachmentId: string,
  componentId: string,
): IUploadAttachmentAction {
  return {
    type: ActionTypes.UPLOAD_ATTACHMENT,
    file,
    attachmentType,
    tmpAttachmentId,
    componentId,
  };
}

export function uploadAttachmentFulfilled(
  attachment: IAttachment,
  attachmentType: string,
  tmpAttachmentId: string,
  componentId: string,
): IUploadAttachmentActionFulfilled {
  return {
    type: ActionTypes.UPLOAD_ATTACHMENT_FULFILLED,
    attachment,
    attachmentType,
    tmpAttachmentId,
    componentId,
  };
}

export function uploadAttachmentRejected(
  attachmentId: string,
  attachmentType: string,
  componentId: string,
  validationMessages: IComponentValidations,
): IUploadAttachmentActionRejected {
  return {
    type: ActionTypes.UPLOAD_ATTACHMENT_REJECTED,
    attachmentId,
    attachmentType,
    componentId,
    validationMessages,
  };
}
