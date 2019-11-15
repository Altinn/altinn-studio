import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import { IAttachments } from '..';
import { IRuntimeState } from '../../../../types';
import { mapAttachmentListToAttachments } from '../../../../utils/attachment';
import AttachmentDispatcher from '../attachmentActions';
import * as AttachmentActionsTypes from '../attachmentActionTypes';
import { IData } from './../../../../../../shared/src/types';

export function* watchMapAttachmentsSaga(): SagaIterator {
  yield takeLatest(AttachmentActionsTypes.MAP_ATTACHMENTS, mapAttachments);
}

export const selectAttachments = (state: IRuntimeState): IData[] => state.instanceData.instance.data;

export function* mapAttachments({
}): SagaIterator {
  try {
    const attachments: IData[] = yield select(selectAttachments);
    const mappedAttachments: IAttachments = mapAttachmentListToAttachments(attachments);

    yield call(AttachmentDispatcher.mapAttachmentsFulfilled, mappedAttachments);
  } catch (err) {
      yield call(AttachmentDispatcher.mapAttachmentsRejected, err);
  }
}
