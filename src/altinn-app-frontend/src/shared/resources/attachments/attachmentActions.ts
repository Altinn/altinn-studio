import { bindActionCreators } from 'redux';
import { store } from 'src/store';

import * as deleteActions from './delete/deleteAttachmentActions';
import * as mapActions from './map/mapAttachmentsActions';
import * as uploadActions from './upload/uploadAttachmentActions';
import * as updateActions from './update/updateAttachmentActions';

export type IAttachmentActions = typeof actions;

const actions = {
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

const AttachmentDispatcher: IAttachmentActions = bindActionCreators<any, any>(
  actions,
  store.dispatch,
);

export default AttachmentDispatcher;
