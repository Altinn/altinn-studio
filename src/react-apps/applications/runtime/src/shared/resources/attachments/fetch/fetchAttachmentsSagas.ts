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
    const altinnWindow: IAltinnWindow = window as Window as IAltinnWindow;
    const { org, app, instanceId } = altinnWindow;
    const appId = `${org}/${app}`;
    const attachmentListUrl = `${altinnWindow.location.origin}/${appId}/api/attachment/` +
    `${instanceId}/GetFormAttachments`;
    const response = yield call(get, attachmentListUrl);
    const attachments: IAttachments = mapAttachmentListApiResponseToAttachments(response);
    yield call(AttachmentDispatcher.fetchAttachmentsFulfilled, attachments);
  } catch (err) {
    yield call(AttachmentDispatcher.fetchAttachmentsRejected, err);
  }
}
