import { SagaIterator } from 'redux-saga';
import { call, select, takeEvery } from 'redux-saga/effects';
import { IAltinnWindow } from '..';
import { getFileUploadComponentValidations } from '../../../../components/base/FileUploadComponent';
import FormValidationsDispatcher from '../../../../features/form/validation/actions';
import { IRuntimeState } from '../../../../types';
import { post } from '../../../../utils/networking';
import AttachmentDispatcher from '../attachmentActions';
import * as AttachmentActionsTypes from '../attachmentActionTypes';
import * as deleteActions from './deleteAttachmentActions';

export function* watchDeleteAttachmentSaga(): SagaIterator {
  yield takeEvery(AttachmentActionsTypes.DELETE_ATTACHMENT, deleteAttachmentSaga);
}

export function* deleteAttachmentSaga(
  { attachment, attachmentType, componentId }: deleteActions.IDeleteAttachmentAction): SagaIterator {
  const state: IRuntimeState = yield select();
  const language = state.language.language;
  try {
    // Sets validations to empty.
    const newValidations = getFileUploadComponentValidations(null, null);
    yield call(FormValidationsDispatcher.updateComponentValidations, newValidations, componentId);
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, app, instanceId, reportee } = altinnWindow;
    const appId = `${org}/${app}`;
    const deleteUrl = `${altinnWindow.location.origin}/${appId}/api/attachment/` +
    `${instanceId}/DeleteFormAttachment?attachmentType=${attachmentType}&attachmentId=${attachment.id}`;
    const response = yield call(post, deleteUrl);
    if (response.status === 200) {
      yield call(AttachmentDispatcher.deleteAttachmentFulfilled, attachment.id, attachmentType, componentId);
    } else {
      const validations = getFileUploadComponentValidations('delete', language);
      yield call(FormValidationsDispatcher.updateComponentValidations, validations, componentId);
      yield call(AttachmentDispatcher.deleteAttachmentRejected,
        attachment, attachmentType, componentId);

    }
  } catch (err) {
    const validations = getFileUploadComponentValidations('delete', language);
    yield call(FormValidationsDispatcher.updateComponentValidations, validations, componentId);
    yield call(AttachmentDispatcher.deleteAttachmentRejected,
      attachment, attachmentType, componentId);
    console.error(err);
  }
}
