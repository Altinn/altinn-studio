import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { IAttachment, IAttachments } from '.';
import { store } from '../../../store';

import * as deleteActions from './delete/deleteAttachmentActions';
import * as mapActions from './map/mapAttachmentsActions';
import * as uploadActions from './upload/uploadAttachmentActions';
import * as updateActions from './update/updateAttachmentActions';

export interface IAttachmentActions extends ActionCreatorsMapObject {
  uploadAttachment: (
    file: File,
    fileType: string,
    attachmentId: string,
    componentId: string,
  ) => uploadActions.IUploadAttachmentAction;
  uploadAttachmentFulfilled: (
    attachment: IAttachment,
    fileType: string,
    tmpAttachmentId: string,
    componentId: string,
  ) => uploadActions.IUploadAttachmentActionFulfilled;
  uploadAttachmentRejected: (
    attachmentId: string,
    attachmentType: string,
    componentId: string,
  ) => uploadActions.IUploadAttachmentActionRejected;
  updateAttachment: (
    attachment: IAttachment,
    attachmentType: string,
    tag: string,
    componentId: string,
  ) => updateActions.IUpdateAttachmentAction;
  updateAttachmentFulfilled: (
    attachment: IAttachment,
    attachmentType: string,
  ) => updateActions.IUpdateAttachmentActionFulfilled;
  updateAttachmentRejected: (
    attachment: IAttachment,
    attachmentType: string,
    tag: string,
  ) => updateActions.IUpdateAttachmentActionRejected;
  deleteAttachment: (
    attachment: IAttachment,
    attachmentType: string,
    componentId: string,
  ) => deleteActions.IDeleteAttachmentAction;
  deleteAttachmentFulfilled: (
    attachmentId: string,
    attachmentType: string,
    componentId: string,
  ) => deleteActions.IDeleteAttachmentActionFulfilled;
  deleteAttachmentRejected: (
    attachment: IAttachment,
    attachmentType: string,
    componentId: string,
  ) => deleteActions.IDeleteAttachmentActionRejected;
  mapAttachments: () => Action;
  mapAttachmentsFulfilled: (attachments: IAttachments) => mapActions.IMapAttachmentsActionFulfilled;
  mapAttachmentsRejected: (error: Error) => mapActions.IMapAttachmentsActionRejected;
}

const actions: IAttachmentActions = {
  uploadAttachment: uploadActions.uploadAttachment,
  uploadAttachmentFulfilled: uploadActions.uploadAttachmentFulfilled,
  uploadAttachmentRejected: uploadActions.uploadAttachmentRejected,
  updateAttachment: updateActions.updateAttachment,
  updateAttachmentFulfilled: updateActions.updateAttachmentFulfilled,
  updateAttachmentRejected: updateActions.updateAttachmentRejected,
  deleteAttachment: deleteActions.deleteAttachment,
  deleteAttachmentFulfilled: deleteActions.deleteAttachmentFulfilled,
  deleteAttachmentRejected: deleteActions.deleteAttachmentRejected,
  mapAttachments: mapActions.mapAttachments,
  mapAttachmentsFulfilled: mapActions.mapAttachmentsFulfilled,
  mapAttachmentsRejected: mapActions.mapAttachmentsRejected,
};

const AttachmentDispatcher: IAttachmentActions = bindActionCreators<any, any>(actions, store.dispatch);

export default AttachmentDispatcher;
