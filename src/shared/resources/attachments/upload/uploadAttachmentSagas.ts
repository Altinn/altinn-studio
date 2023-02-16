import { call, put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AxiosRequestConfig } from 'axios';
import type { SagaIterator } from 'redux-saga';

import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { ValidationActions } from 'src/features/form/validation/validationSlice';
import { AttachmentActions } from 'src/shared/resources/attachments/attachmentSlice';
import { getFileUploadComponentValidations } from 'src/utils/formComponentUtils';
import { httpPost } from 'src/utils/network/networking';
import { fileUploadUrl } from 'src/utils/urls/appUrlHelper';
import { customEncodeURI } from 'src/utils/urls/urlHelper';
import type { IAttachment } from 'src/shared/resources/attachments';
import type { IUploadAttachmentAction } from 'src/shared/resources/attachments/upload/uploadAttachmentActions';
import type { IRuntimeState } from 'src/types';
import type { ILanguage } from 'src/types/shared';

export function* uploadAttachmentSaga({
  payload: { file, attachmentType, tmpAttachmentId, componentId, dataModelBindings, index },
}: PayloadAction<IUploadAttachmentAction>): SagaIterator {
  const currentView: string = yield select((s: IRuntimeState) => s.formLayout.uiConfig.currentView);
  const language: ILanguage = yield select((s: IRuntimeState) => s.language.language);

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

    const fileUploadLink = fileUploadUrl(attachmentType);
    let contentType;

    if (!file.type) {
      contentType = `application/octet-stream`;
    } else if (file.name.toLowerCase().endsWith('.csv')) {
      contentType = 'text/csv';
    } else {
      contentType = file.type;
    }

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename=${customEncodeURI(file.name)}`,
      },
    };

    const response: any = yield call(httpPost, fileUploadLink, config, file);

    if (response.status === 201) {
      const attachment: IAttachment = {
        name: file.name,
        size: file.size,
        uploaded: true,
        tags: [],
        id: response.data.id,
        deleting: false,
        updating: false,
      };
      yield put(
        AttachmentActions.uploadAttachmentFulfilled({
          attachment,
          attachmentType,
          tmpAttachmentId,
          componentId,
        }),
      );

      if (dataModelBindings && (dataModelBindings.simpleBinding || dataModelBindings.list)) {
        yield put(
          FormDataActions.update({
            componentId: componentId,
            data: response.data.id,
            field: dataModelBindings.simpleBinding
              ? `${dataModelBindings.simpleBinding}`
              : `${dataModelBindings.list}[${index}]`,
          }),
        );
      }
    } else {
      const validations = getFileUploadComponentValidations('upload', language);
      yield put(
        ValidationActions.updateComponentValidations({
          componentId,
          layoutId: currentView,
          validations,
        }),
      );
      yield put(
        AttachmentActions.uploadAttachmentRejected({
          componentId,
          attachmentId: tmpAttachmentId,
          attachmentType,
        }),
      );
    }
  } catch (err) {
    const validations = getFileUploadComponentValidations('upload', language);
    yield put(
      ValidationActions.updateComponentValidations({
        componentId,
        layoutId: currentView,
        validations,
      }),
    );
    yield put(
      AttachmentActions.uploadAttachmentRejected({
        componentId,
        attachmentType,
        attachmentId: tmpAttachmentId,
      }),
    );
  }
}
