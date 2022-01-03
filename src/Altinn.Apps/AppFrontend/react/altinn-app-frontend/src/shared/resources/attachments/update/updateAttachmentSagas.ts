import { SagaIterator } from 'redux-saga';
import { call, takeEvery, put, select } from 'redux-saga/effects';
import { updateComponentValidations } from 'src/features/form/validation/validationSlice';
import { post, httpDelete } from 'src/utils/networking';
import { AxiosRequestConfig } from 'axios';
import { IAttachment } from '..';
import { getFileUploadComponentValidations } from '../../../../utils/formComponentUtils';
import { IRuntimeState } from '../../../../types';
import { fileTagUrl } from '../../../../utils/urlHelper';
import AttachmentDispatcher from '../attachmentActions';
import * as AttachmentActionsTypes from '../attachmentActionTypes';
import * as updateActions from './updateAttachmentActions';

export function* updateAttachmentSaga(
  {
    attachment,
    attachmentType,
    tag,
  }: updateActions.IUpdateAttachmentAction,
): SagaIterator {
  const state: IRuntimeState = yield select();
  const currentView = state.formLayout.uiConfig.currentView;
  const language = state.language.language;

  try {
    // Sets validations to empty.
    const newValidations = getFileUploadComponentValidations(null, null);
    yield put(updateComponentValidations({
      componentId: attachmentType,
      layoutId: currentView,
      validations: newValidations,
    }));

    const fileUpdateLink = fileTagUrl(attachment.id);

    if (attachment.tags !== undefined && attachment.tags.length > 0 && tag !== attachment.tags[0]) {
      const deleteResponse: any = yield call(httpDelete, `${fileUpdateLink}/${attachment.tags[0]}`);
      if (deleteResponse.status !== 204) {
        const validations = getFileUploadComponentValidations('update', language, attachment.id);
        yield put(updateComponentValidations({
          componentId: attachmentType,
          layoutId: currentView,
          validations,
        }));
        yield call(AttachmentDispatcher.updateAttachmentRejected,
          attachment, attachmentType, attachment.tags[0]);
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
      yield call(AttachmentDispatcher.updateAttachmentFulfilled,
        newAttachment, attachmentType);
    } else {
      const validations = getFileUploadComponentValidations('update', language, attachment.id);
      yield put(updateComponentValidations({
        componentId: attachmentType,
        layoutId: currentView,
        validations,
      }));
      yield call(AttachmentDispatcher.updateAttachmentRejected,
        attachment, attachmentType, undefined);
    }
  } catch (err) {
    const validations = getFileUploadComponentValidations('update', language, attachment.id);
    yield put(updateComponentValidations({
      componentId: attachmentType,
      layoutId: currentView,
      validations,
    }));
    yield call(AttachmentDispatcher.updateAttachmentRejected,
      attachment, attachmentType, undefined);
  }
}

export function* watchUpdateAttachmentSaga(): SagaIterator {
  yield takeEvery(AttachmentActionsTypes.UPDATE_ATTACHMENT, updateAttachmentSaga);
}
