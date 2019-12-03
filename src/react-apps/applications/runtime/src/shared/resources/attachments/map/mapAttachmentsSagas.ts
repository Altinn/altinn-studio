import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import { IAttachments } from '..';
import { IRuntimeState } from '../../../../types';
import { mapAttachmentListToAttachments } from '../../../../utils/attachment';
import AttachmentDispatcher from '../attachmentActions';
import * as AttachmentActionsTypes from '../attachmentActionTypes';
import { IData, IInstance } from './../../../../../../shared/src/types';
import { getCurrentTaskData } from './../../../../../../shared/src/utils/applicationMetaDataUtils';
import { IApplicationMetadata } from './../../applicationMetadata';

export function* watchMapAttachmentsSaga(): SagaIterator {
  yield takeLatest(AttachmentActionsTypes.MAP_ATTACHMENTS, mapAttachments);
}

export const selectAttachments = (state: IRuntimeState): IData[] => state.instanceData.instance.data;
const SelectInstance = (state: IRuntimeState): IInstance => state.instanceData.instance;
const SelectApplicationMetaData = (state: IRuntimeState): IApplicationMetadata =>
  state.applicationMetadata.applicationMetadata;

export function* mapAttachments({
}): SagaIterator {
  try {
    const instance = yield select(SelectInstance);
    const applicationMetadata = yield select(SelectApplicationMetaData);

    const defaultElement = getCurrentTaskData(applicationMetadata, instance);

    const attachments: IData[] = yield select(selectAttachments);
    const mappedAttachments: IAttachments = mapAttachmentListToAttachments(attachments, defaultElement.id);

    yield call(AttachmentDispatcher.mapAttachmentsFulfilled, mappedAttachments);
  } catch (err) {
      yield call(AttachmentDispatcher.mapAttachmentsRejected, err);
  }
}
