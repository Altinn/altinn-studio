import { SagaIterator } from 'redux-saga';
import { call, select, take, takeLatest } from 'redux-saga/effects';
import { IData, IInstance } from 'altinn-shared/types';
import { getCurrentTaskData } from 'altinn-shared/utils';
import { IAttachments } from '..';
import { IRuntimeState } from '../../../../types';
import { mapAttachmentListToAttachments } from '../../../../utils/attachment';
import AttachmentDispatcher from '../attachmentActions';
import * as AttachmentActionsTypes from '../attachmentActionTypes';
import { IApplicationMetadata } from '../../applicationMetadata';
import { FETCH_APPLICATION_METADATA_FULFILLED } from '../../applicationMetadata/actions/types';

export function* watchMapAttachmentsSaga(): SagaIterator {
  yield takeLatest(AttachmentActionsTypes.MAP_ATTACHMENTS, mapAttachments);
}

export const selectAttachments = (state: IRuntimeState): IData[] => state.instanceData.instance.data;
const SelectInstance = (state: IRuntimeState): IInstance => state.instanceData.instance;
const SelectApplicationMetaData =
  (state: IRuntimeState): IApplicationMetadata => state.applicationMetadata.applicationMetadata;

export function* mapAttachments(): SagaIterator {
  try {
    const instance = yield select(SelectInstance);

    // Fixes race between metadata and attachments on reload
    yield take(FETCH_APPLICATION_METADATA_FULFILLED);

    const applicationMetadata = yield select(SelectApplicationMetaData);

    const defaultElement = getCurrentTaskData(applicationMetadata, instance);

    const attachments: IData[] = yield select(selectAttachments);
    const mappedAttachments: IAttachments = mapAttachmentListToAttachments(attachments, defaultElement.id);

    yield call(AttachmentDispatcher.mapAttachmentsFulfilled, mappedAttachments);
  } catch (err) {
    yield call(AttachmentDispatcher.mapAttachmentsRejected, err);
  }
}
