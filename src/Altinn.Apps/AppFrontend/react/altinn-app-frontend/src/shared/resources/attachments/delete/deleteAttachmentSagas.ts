import { SagaIterator } from 'redux-saga';
import { call, select, takeEvery } from 'redux-saga/effects';
import { getFileUploadComponentValidations } from '../../../../utils/formComponentUtils';
import FormValidationsDispatcher from '../../../../features/form/validation/validationActions';
import { IRuntimeState } from '../../../../types';
import { httpDelete } from '../../../../utils/networking';
import { dataElementUrl } from '../../../../utils/urlHelper';
import AttachmentDispatcher from '../attachmentActions';
import * as AttachmentActionsTypes from '../attachmentActionTypes';
import * as deleteActions from './deleteAttachmentActions';

export function* watchDeleteAttachmentSaga(): SagaIterator {
  yield takeEvery(AttachmentActionsTypes.DELETE_ATTACHMENT, deleteAttachmentSaga);
}

export function* deleteAttachmentSaga({
  attachment,
  attachmentType,
  componentId,
}: deleteActions.IDeleteAttachmentAction): SagaIterator {
  const state: IRuntimeState = yield select();
  const language = state.language.language;
  try {
    // Sets validations to empty.
    const newValidations = getFileUploadComponentValidations(null, null);
    yield call(FormValidationsDispatcher.updateComponentValidations, newValidations, componentId);

    const response: any = yield call(httpDelete, dataElementUrl(attachment.id));
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
