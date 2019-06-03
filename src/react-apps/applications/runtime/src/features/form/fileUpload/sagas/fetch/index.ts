import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { IAltinnWindow, IAttachments } from '../..';
import { mapAttachmentListApiResponseToAttachments } from '../../../../../utils/attachment';
import { get } from '../../../../../utils/networking';
import FormFileUploadDispatcher from '../../actions';
import * as FileUploadActionsTypes from '../../actions/types';

export function* watchFetchAttachmentsSaga(): SagaIterator {
  yield takeLatest(FileUploadActionsTypes.FETCH_ATTACHMENTS, fetchAttachments);
}

export function* fetchAttachments(): SagaIterator {
  try {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service, instanceId, reportee } = altinnWindow;
    const servicePath = `${org}/${service}`;
    const attachmentListUrl = `${altinnWindow.location.origin}/runtime/api/attachment/${reportee}/${servicePath}/` +
      `${instanceId}/GetFormAttachments`;
    const response = yield call(get, attachmentListUrl);
    const attachments: IAttachments = mapAttachmentListApiResponseToAttachments(response);
    yield call(FormFileUploadDispatcher.fetchAttachmentsFulfilled, attachments);
  } catch (err) {
    yield call(FormFileUploadDispatcher.fetchAttachmentsRejected, err);
  }
}
