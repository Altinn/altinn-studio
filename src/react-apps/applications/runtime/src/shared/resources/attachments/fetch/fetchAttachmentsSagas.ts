import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { IAttachments } from '..';
import { IAltinnWindow } from '../../../../types';
import { mapAttachmentListApiResponseToAttachments } from '../../../../utils/attachment';
import { get } from '../../../../utils/networking';
import AttachmentDispatcher from '../attachmentActions';
import * as AttachmentActionsTypes from '../attachmentActionTypes';

export function* watchFetchAttachmentsSaga(): SagaIterator {
  yield takeLatest(AttachmentActionsTypes.FETCH_ATTACHMENTS, fetchAttachments);
}

export function* fetchAttachments(): SagaIterator {
  try {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service, instanceId } = altinnWindow;
    const servicePath = `${org}/${service}`;
    const attachmentListUrl = `${altinnWindow.location.origin}/${servicePath}/api/attachment/` +
    `${instanceId}/GetFormAttachments`;
    const response = yield call(get, attachmentListUrl);
    const attachments: IAttachments = mapAttachmentListApiResponseToAttachments(response);
    yield call(AttachmentDispatcher.fetchAttachmentsFulfilled, attachments);
  } catch (err) {
    yield call(AttachmentDispatcher.fetchAttachmentsRejected, err);
  }
}
