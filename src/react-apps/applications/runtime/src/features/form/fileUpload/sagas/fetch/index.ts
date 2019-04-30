import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { mapAttachmentListApiResponseToAttachments } from '../../../../../utils/attachment';
import { get } from '../../../../../utils/networking';
import FormFileUploadDispatcher from '../../actions';
import * as FileUploadActionsTypes from '../../actions/types';
import { IAltinnWindow, IAttachments } from '../../types';

export function* watchFetchAttachmentsSaga(): SagaIterator {
  yield takeLatest(FileUploadActionsTypes.FETCH_ATTACHMENTS, fetchAttachments);
}

export function* fetchAttachments(): SagaIterator {
  try {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service, instanceId, reportee } = altinnWindow;
    const servicePath = `${org}/${service}`;
    const getAttachmentListUrl = `${altinnWindow.location.origin}/runtime/api/${reportee}/` +
      `${servicePath}/GetAttachmentListUrl/${instanceId}`;
    const attachmentListUrl = yield call(get, getAttachmentListUrl);
    const response = yield call(get, attachmentListUrl);
    const attachments: IAttachments = mapAttachmentListApiResponseToAttachments(response);
    yield call(FormFileUploadDispatcher.fetchAttachmentsFulfilled, attachments);
  } catch (err) {
    yield call(FormFileUploadDispatcher.fetchAttachmentsRejected, err);
  }
}
