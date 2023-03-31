import { call, put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AxiosRequestConfig } from 'axios';
import type { SagaIterator } from 'redux-saga';

import { AttachmentActions } from 'src/features/attachments/attachmentSlice';
import { ValidationActions } from 'src/features/validation/validationSlice';
import { getFileUploadComponentValidations } from 'src/utils/formComponentUtils';
import { httpDelete, httpPost } from 'src/utils/network/networking';
import { selectNotNull } from 'src/utils/sagas';
import { fileTagUrl } from 'src/utils/urls/appUrlHelper';
import type { IAttachment } from 'src/features/attachments';
import type { IUpdateAttachmentAction } from 'src/features/attachments/update/updateAttachmentActions';
import type { IRuntimeState } from 'src/types';
import type { ILanguage } from 'src/types/shared';

export function* updateAttachmentSaga({
  payload: { attachment, componentId, baseComponentId, tag },
}: PayloadAction<IUpdateAttachmentAction>): SagaIterator {
  const state: IRuntimeState = yield select();
  const currentView = state.formLayout.uiConfig.currentView;
  const language: ILanguage = yield selectNotNull((state) => state.language.language);

  try {
    // Sets validations to empty.
    const newValidations = getFileUploadComponentValidations(null, {});
    yield put(
      ValidationActions.updateComponentValidations({
        componentId,
        layoutId: currentView,
        validations: newValidations,
      }),
    );

    const fileUpdateLink = fileTagUrl(attachment.id);

    if (attachment.tags !== undefined && attachment.tags.length > 0 && tag !== attachment.tags[0]) {
      const deleteResponse: any = yield call(httpDelete, `${fileUpdateLink}/${attachment.tags[0]}`);
      if (deleteResponse.status !== 204) {
        const validations = getFileUploadComponentValidations('update', language, attachment.id);
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

    const response: any = yield call(httpPost, fileUpdateLink, config, `"${tag}"`);

    if (response.status === 201) {
      const newAttachment: IAttachment = {
        ...attachment,
        tags: response.data.tags,
      };
      yield put(
        AttachmentActions.updateAttachmentFulfilled({
          attachment: newAttachment,
          componentId,
          baseComponentId,
        }),
      );
    } else {
      const validations = getFileUploadComponentValidations('update', language, attachment.id);
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
    const validations = getFileUploadComponentValidations('update', language, attachment.id);
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
