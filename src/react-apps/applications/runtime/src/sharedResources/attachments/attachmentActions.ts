import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { IAttachment, IAttachments } from '.';
import { store } from '../../store';

import * as deleteActions from './delete/deleteAttachmentActions';
import * as fetchActions from './fetch/fetchAttachmentsActions';
import * as uploadActions from './upload/uploadAttachmentActions';

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
  fetchAttachments: () => Action;
  fetchAttachmentsFulfilled: (attachments: IAttachments) => fetchActions.IFetchAttachmentsActionFulfilled;
  fetchAttachmentsRejected: (error: Error) => fetchActions.IFetchAttachmentsActionRejected;
}

const actions: IAttachmentActions = {
  uploadAttachment: uploadActions.uploadAttachment,
  uploadAttachmentFulfilled: uploadActions.uploadAttachmentFulfilled,
  uploadAttachmentRejected: uploadActions.uploadAttachmentRejected,
  deleteAttachment: deleteActions.deleteAttachment,
  deleteAttachmentFulfilled: deleteActions.deleteAttachmentFulfilled,
  deleteAttachmentRejected: deleteActions.deleteAttachmentRejected,
  fetchAttachments: fetchActions.fetchAttachments,
  fetchAttachmentsFulfilled: fetchActions.fetchAttachmentsFulfilled,
  fetchAttachmentsRejected: fetchActions.fetchAttachmentsRejected,
};

const AttachmentDispatcher: IAttachmentActions = bindActionCreators<any, any>(actions, store.dispatch);

export default AttachmentDispatcher;
