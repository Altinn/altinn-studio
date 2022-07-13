import type { SagaIterator } from 'redux-saga';
import { call, put, select, takeEvery } from 'redux-saga/effects';
import { ValidationActions } from 'src/features/form/validation/validationSlice';
import { getFileUploadComponentValidations } from '../../../../utils/formComponentUtils';
import type { IRuntimeState } from '../../../../types';
import { httpDelete } from '../../../../utils/networking';
import { dataElementUrl } from '../../../../utils/appUrlHelper';
import { FormDataActions } from 'src/features/form/data/formDataSlice';
import type { AxiosResponse } from 'axios';
import { AttachmentActions } from 'src/shared/resources/attachments/attachmentSlice';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { IDeleteAttachmentAction } from 'src/shared/resources/attachments/delete/deleteAttachmentActions';

export function* watchDeleteAttachmentSaga(): SagaIterator {
  yield takeEvery(AttachmentActions.deleteAttachment, deleteAttachmentSaga);
}

export function* deleteAttachmentSaga({
  payload: { attachment, attachmentType, componentId, dataModelBindings },
}: PayloadAction<IDeleteAttachmentAction>): SagaIterator {
  const language = yield select((s: IRuntimeState) => s.language.language);
  const currentView: string = yield select(
    (s: IRuntimeState) => s.formLayout.uiConfig.currentView,
  );

  try {
    // Sets validations to empty.
    const newValidations = getFileUploadComponentValidations(null, null);
    yield put(
      ValidationActions.updateComponentValidations({
        componentId,
        layoutId: currentView,
        validations: newValidations,
      }),
    );

    const response: AxiosResponse = yield call(
      httpDelete,
      dataElementUrl(attachment.id),
    );
    if (response.status === 200) {
      if (
        dataModelBindings &&
        (dataModelBindings.simpleBinding || dataModelBindings.list)
      ) {
        yield put(
          FormDataActions.deleteAttachmentReference({
            attachmentId: attachment.id,
            componentId,
            dataModelBindings,
          }),
        );
      }
      yield put(
        AttachmentActions.deleteAttachmentFulfilled({
          attachmentId: attachment.id,
          attachmentType,
          componentId,
        }),
      );
    } else {
      throw new Error(
        `Got error response when deleting attachment: ${response.status}`,
      );
    }
  } catch (err) {
    const validations = getFileUploadComponentValidations('delete', language);
    yield put(
      ValidationActions.updateComponentValidations({
        componentId,
        layoutId: currentView,
        validations,
      }),
    );
    yield put(
      AttachmentActions.deleteAttachmentRejected({
        attachment,
        attachmentType,
        componentId,
      }),
    );
    console.error(err);
  }
}
