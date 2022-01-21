import { SagaIterator } from 'redux-saga';
import { call, put, select, takeEvery } from 'redux-saga/effects';
import { updateComponentValidations } from 'src/features/form/validation/validationSlice';
import { getFileUploadComponentValidations } from '../../../../utils/formComponentUtils';
import { IRuntimeState } from '../../../../types';
import { httpDelete } from '../../../../utils/networking';
import { dataElementUrl } from '../../../../utils/urlHelper2';
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
  const currentView = state.formLayout.uiConfig.currentView;
  const language = state.language.language;
  try {
    // Sets validations to empty.
    const newValidations = getFileUploadComponentValidations(null, null);
    yield put(updateComponentValidations({
      componentId,
      layoutId: currentView,
      validations: newValidations,
    }));

    const response: any = yield call(httpDelete, dataElementUrl(attachment.id));
    if (response.status === 200) {
      yield call(AttachmentDispatcher.deleteAttachmentFulfilled, attachment.id, attachmentType, componentId);
    } else {
      const validations = getFileUploadComponentValidations('delete', language);
      yield put(updateComponentValidations({
        componentId,
        layoutId: currentView,
        validations,
      }));
      yield call(AttachmentDispatcher.deleteAttachmentRejected,
        attachment, attachmentType, componentId);
    }
  } catch (err) {
    const validations = getFileUploadComponentValidations('delete', language);
    yield put(updateComponentValidations({
      componentId,
      layoutId: currentView,
      validations,
    }));
    yield call(AttachmentDispatcher.deleteAttachmentRejected,
      attachment, attachmentType, componentId);
    console.error(err);
  }
}
