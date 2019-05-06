import { SagaIterator } from 'redux-saga';
import { call, select, takeEvery } from 'redux-saga/effects';
import { IAltinnWindow, IAttachment } from '../../';
import { getFileUploadComponentValidations } from '../../../../../components/base/FileUploadComponent';
import { IRuntimeState } from '../../../../../reducers';
import { get, post } from '../../../../../utils/networking';
import FormFileUploadDispatcher from '../../actions';
import * as FileUploadActionsTypes from '../../actions/types';
import * as uploadActions from '../../actions/upload';

export function* uploadAttachmentSaga(
  { file, attachmentType, tmpAttachmentId, componentId }: uploadActions.IUploadAttachmentAction): SagaIterator {
  const state: IRuntimeState = yield select();
  const language = state.language.language;
  try {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service, instanceId, reportee } = altinnWindow;
    const servicePath = `${org}/${service}`;
    const data = new FormData();
    data.append('file', file);
    const url = `${altinnWindow.location.origin}/runtime/api/${reportee}/` +
      `${servicePath}/GetAttachmentUploadUrl/${instanceId}/${attachmentType}/${file.name}`;

    const fileUploadLink = yield call(get, url);
    const response = yield call(post, fileUploadLink, null, data);
    if (response.status === 200) {
      const attachment: IAttachment
        = { name: file.name, size: file.size, uploaded: true, id: response.data.id, deleting: false };
      yield call(FormFileUploadDispatcher.uploadAttachmentFulfilled,
        attachment, attachmentType, tmpAttachmentId, componentId);
    } else {
      const validationMessages = getFileUploadComponentValidations('upload', language);
      yield call(FormFileUploadDispatcher.uploadAttachmentRejected,
        tmpAttachmentId, attachmentType, componentId, validationMessages);
    }
  } catch (err) {
    const validationMessages = getFileUploadComponentValidations('upload', language);
    yield call(FormFileUploadDispatcher.uploadAttachmentRejected,
      tmpAttachmentId, attachmentType, componentId, validationMessages);
  }
}

export function* watchUploadAttachmentSaga(): SagaIterator {
  yield takeEvery(FileUploadActionsTypes.UPLOAD_ATTACHMENT, uploadAttachmentSaga);
}
