import type { SagaIterator } from "redux-saga";
import { call, put, select, takeEvery } from "redux-saga/effects";
import { updateComponentValidations } from "src/features/form/validation/validationSlice";
import { getFileUploadComponentValidations } from "../../../../utils/formComponentUtils";
import type { IRuntimeState } from "../../../../types";
import { httpDelete } from "../../../../utils/networking";
import { dataElementUrl } from "../../../../utils/appUrlHelper";
import AttachmentDispatcher from "../attachmentActions";
import * as AttachmentActionsTypes from "../attachmentActionTypes";
import type * as deleteActions from "./deleteAttachmentActions";
import FormDataActions from "src/features/form/data/formDataActions";
import type { AxiosResponse } from "axios";

export function* watchDeleteAttachmentSaga(): SagaIterator {
  yield takeEvery(
    AttachmentActionsTypes.DELETE_ATTACHMENT,
    deleteAttachmentSaga
  );
}

export function* deleteAttachmentSaga({
  attachment,
  attachmentType,
  componentId,
  dataModelBindings,
}: deleteActions.IDeleteAttachmentAction): SagaIterator {
  const language = yield select((s: IRuntimeState) => s.language.language);
  const currentView: string = yield select(
    (s: IRuntimeState) => s.formLayout.uiConfig.currentView
  );

  try {
    // Sets validations to empty.
    const newValidations = getFileUploadComponentValidations(null, null);
    yield put(
      updateComponentValidations({
        componentId,
        layoutId: currentView,
        validations: newValidations,
      })
    );

    const response: AxiosResponse = yield call(
      httpDelete,
      dataElementUrl(attachment.id)
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
          })
        );
      }
      yield call(
        AttachmentDispatcher.deleteAttachmentFulfilled,
        attachment.id,
        attachmentType,
        componentId
      );
    } else {
      throw new Error(
        `Got error response when deleting attachment: ${response.status}`
      );
    }
  } catch (err) {
    const validations = getFileUploadComponentValidations("delete", language);
    yield put(
      updateComponentValidations({
        componentId,
        layoutId: currentView,
        validations,
      })
    );
    yield call(
      AttachmentDispatcher.deleteAttachmentRejected,
      attachment,
      attachmentType,
      componentId
    );
    console.error(err);
  }
}
