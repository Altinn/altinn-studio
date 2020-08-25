import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { IAttachments } from '.';
import { store } from '../../redux/store';

import * as mapActions from './map/mapAttachmentsActions';

export interface IAttachmentActions extends ActionCreatorsMapObject {
  mapAttachments: () => Action;
  mapAttachmentsFulfilled: (attachments: IAttachments) => mapActions.IMapAttachmentsActionFulfilled;
  mapAttachmentsRejected: (error: Error) => mapActions.IMapAttachmentsActionRejected;
}

const actions: IAttachmentActions = {
  mapAttachments: mapActions.mapAttachments,
  mapAttachmentsFulfilled: mapActions.mapAttachmentsFulfilled,
  mapAttachmentsRejected: mapActions.mapAttachmentsRejected,
};

const AttachmentDispatcher: IAttachmentActions = bindActionCreators<any, any>(actions, store.dispatch);

export default AttachmentDispatcher;
