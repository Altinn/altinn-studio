import type { SagaIterator } from 'redux-saga';
import { call, takeEvery, put, select } from 'redux-saga/effects';
import { updateComponentValidations } from 'src/features/form/validation/validationSlice';
import { post, httpDelete } from 'src/utils/networking';
import type { AxiosRequestConfig } from 'axios';
import type { IAttachment } from '..';
import { getFileUploadComponentValidations } from '../../../../utils/formComponentUtils';
import type { IRuntimeState } from '../../../../types';
import AttachmentDispatcher from '../attachmentActions';
import * as AttachmentActionsTypes from '../attachmentActionTypes';
import type * as updateActions from './updateAttachmentActions';
import { fileTagUrl } from 'src/utils/appUrlHelper';

export function* updateAttachmentSaga({
  attachment,
  componentId,
  baseComponentId,
  tag,
}: updateActions.IUpdateAttachmentAction): SagaIterator {
  const state: IRuntimeState = yield select();
  const currentView = state.formLayout.uiConfig.currentView;
  const language = state.language.language;

  try {
    // Sets validations to empty.
    const newValidations = getFileUploadComponentValidations(null, null);
    yield put(
      updateComponentValidations({
        componentId,
        layoutId: currentView,
        validations: newValidations,
      }),
    );

    const fileUpdateLink = fileTagUrl(attachment.id);

    if (
      attachment.tags !== undefined &&
      attachment.tags.length > 0 &&
      tag !== attachment.tags[0]
    ) {
      const deleteResponse: any = yield call(
        httpDelete,
        `${fileUpdateLink}/${attachment.tags[0]}`,
      );
      if (deleteResponse.status !== 204) {
        const validations = getFileUploadComponentValidations(
          'update',
          language,
          attachment.id,
        );
        yield put(
          updateComponentValidations({
            componentId,
            layoutId: currentView,
            validations,
          }),
        );
        yield call(
          AttachmentDispatcher.updateAttachmentRejected,
          attachment,
          componentId,
          baseComponentId,
          attachment.tags[0],
        );
        return;
      }
    }

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const response: any = yield call(post, fileUpdateLink, config, `"${tag}"`);

    if (response.status === 201) {
      const newAttachment: IAttachment = {
        ...attachment,
        tags: response.data.tags,
      };
      yield call(
        AttachmentDispatcher.updateAttachmentFulfilled,
        newAttachment,
        componentId,
        baseComponentId,
      );
    } else {
      const validations = getFileUploadComponentValidations(
        'update',
        language,
        attachment.id,
      );
      yield put(
        updateComponentValidations({
          componentId,
          layoutId: currentView,
          validations,
        }),
      );
      yield call(
        AttachmentDispatcher.updateAttachmentRejected,
        attachment,
        componentId,
        baseComponentId,
        undefined,
      );
    }
  } catch (err) {
    const validations = getFileUploadComponentValidations(
      'update',
      language,
      attachment.id,
    );
    yield put(
      updateComponentValidations({
        componentId,
        layoutId: currentView,
        validations,
      }),
    );
    yield call(
      AttachmentDispatcher.updateAttachmentRejected,
      attachment,
      componentId,
      baseComponentId,
      undefined,
    );
  }
}

export function* watchUpdateAttachmentSaga(): SagaIterator {
  yield takeEvery(
    AttachmentActionsTypes.UPDATE_ATTACHMENT,
    updateAttachmentSaga,
  );
}
