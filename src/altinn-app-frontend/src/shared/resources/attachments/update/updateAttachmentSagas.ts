import type { SagaIterator } from 'redux-saga';
import { call, takeEvery, put, select } from 'redux-saga/effects';
import { ValidationActions } from 'src/features/form/validation/validationSlice';
import { post, httpDelete } from 'src/utils/networking';
import type { AxiosRequestConfig } from 'axios';
import type { IAttachment } from '..';
import { getFileUploadComponentValidations } from '../../../../utils/formComponentUtils';
import type { IRuntimeState } from '../../../../types';
import { fileTagUrl } from 'src/utils/appUrlHelper';
import type { IUpdateAttachmentAction } from './updateAttachmentActions';
import { AttachmentActions } from 'src/shared/resources/attachments/attachmentSlice';
import type { PayloadAction } from '@reduxjs/toolkit';

export function* updateAttachmentSaga({
  payload: { attachment, componentId, baseComponentId, tag },
}: PayloadAction<IUpdateAttachmentAction>): SagaIterator {
  const state: IRuntimeState = yield select();
  const currentView = state.formLayout.uiConfig.currentView;
  const language = state.language.language;

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
          ValidationActions.updateComponentValidations({
            componentId,
            layoutId: currentView,
            validations,
          }),
        );
        yield put(
          AttachmentActions.updateAttachmentRejected({
            attachment,
            componentId,
            baseComponentId,
            tag: attachment.tags[0],
          }),
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
      yield put(
        AttachmentActions.updateAttachmentFulfilled({
          attachment: newAttachment,
          componentId: componentId,
          baseComponentId,
        }),
      );
    } else {
      const validations = getFileUploadComponentValidations(
        'update',
        language,
        attachment.id,
      );
      yield put(
        ValidationActions.updateComponentValidations({
          componentId,
          layoutId: currentView,
          validations,
        }),
      );
      yield put(
        AttachmentActions.updateAttachmentRejected({
          attachment,
          componentId,
          baseComponentId,
          tag: undefined,
        }),
      );
    }
  } catch (err) {
    const validations = getFileUploadComponentValidations(
      'update',
      language,
      attachment.id,
    );
    yield put(
      ValidationActions.updateComponentValidations({
        componentId,
        layoutId: currentView,
        validations,
      }),
    );
    yield put(
      AttachmentActions.updateAttachmentRejected({
        attachment,
        componentId,
        baseComponentId,
        tag: undefined,
      }),
    );
  }
}

export function* watchUpdateAttachmentSaga(): SagaIterator {
  yield takeEvery(AttachmentActions.updateAttachment, updateAttachmentSaga);
}
