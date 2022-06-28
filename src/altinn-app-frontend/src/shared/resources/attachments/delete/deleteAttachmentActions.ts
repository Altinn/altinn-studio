import type { Action } from "redux";
import type { IAttachment } from "..";
import * as ActionTypes from "../attachmentActionTypes";
import type { IDataModelBindings } from "src/types";

export interface IDeleteAttachmentAction extends Action {
  attachment: IAttachment;
  attachmentType: string;
  componentId: string;
  dataModelBindings: IDataModelBindings;
}

export interface IDeleteAttachmentActionFulfilled extends Action {
  attachmentId: string;
  attachmentType: string;
  componentId: string;
}

export interface IDeleteAttachmentActionRejected extends Action {
  attachment: IAttachment;
  attachmentType: string;
  componentId: string;
}

export function deleteAttachment(
  attachment: IAttachment,
  attachmentType: string,
  componentId: string,
  dataModelBindings: IDataModelBindings
): IDeleteAttachmentAction {
  return {
    type: ActionTypes.DELETE_ATTACHMENT,
    attachment,
    attachmentType,
    componentId,
    dataModelBindings,
  };
}

export function deleteAttachmentFulfilled(
  attachmentId: string,
  attachmentType: string,
  componentId: string
): IDeleteAttachmentActionFulfilled {
  return {
    type: ActionTypes.DELETE_ATTACHMENT_FULFILLED,
    attachmentId,
    attachmentType,
    componentId,
  };
}

export function deleteAttachmentRejected(
  attachment: IAttachment,
  attachmentType: string,
  componentId: string
): IDeleteAttachmentActionRejected {
  return {
    type: ActionTypes.DELETE_ATTACHMENT_REJECTED,
    attachment,
    attachmentType,
    componentId,
  };
}
