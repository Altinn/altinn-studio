import { AxiosError } from 'axios';
import { call, put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { SagaIterator } from 'redux-saga';

import { AttachmentActions } from 'src/features/attachments/attachmentSlice';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { ValidationActions } from 'src/features/validation/validationSlice';
import { staticUseLanguageFromState } from 'src/hooks/useLanguage';
import { getFileUploadComponentValidations } from 'src/utils/formComponentUtils';
import { httpPost } from 'src/utils/network/networking';
import { fileUploadUrl } from 'src/utils/urls/appUrlHelper';
import { customEncodeURI } from 'src/utils/urls/urlHelper';
import { BackendValidationSeverity, getValidationMessage } from 'src/utils/validation/backendValidation';
import type { IAttachment } from 'src/features/attachments';
import type { IUploadAttachmentAction } from 'src/features/attachments/upload/uploadAttachmentActions';
import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { IRuntimeState } from 'src/types';
import type { IComponentValidations, IValidationIssue } from 'src/utils/validation/types';

export function* uploadAttachmentSaga({
  payload: { file, attachmentType, tmpAttachmentId, componentId, dataModelBindings, index },
}: PayloadAction<IUploadAttachmentAction>): SagaIterator {
  const currentView: string = yield select((s: IRuntimeState) => s.formLayout.uiConfig.currentView);
  const backendFeatures = yield select((s: IRuntimeState) => s.applicationMetadata.applicationMetadata?.features);
  const langTools: IUseLanguage = yield select(staticUseLanguageFromState);

  try {
    // Sets validations to empty.
    const newValidations = getFileUploadComponentValidations(null, langTools);
    yield put(
      ValidationActions.updateComponentValidations({
        componentId,
        pageKey: currentView,
        validationResult: { validations: newValidations },
      }),
    );

    const fileUploadLink = fileUploadUrl(attachmentType);
    let contentType: string;

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

    const response: AxiosResponse = yield call(httpPost, fileUploadLink, config, file);

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
          componentId,
          data: response.data.id,
          field: dataModelBindings.simpleBinding
            ? `${dataModelBindings.simpleBinding}`
            : `${dataModelBindings.list}[${index}]`,
        }),
      );
    }
  } catch (err) {
    let validations: IComponentValidations;

    if (backendFeatures?.jsonObjectInDataResponse && err instanceof AxiosError && err.response?.data?.result) {
      const validationIssues: IValidationIssue[] = err.response.data.result;

      validations = {
        simpleBinding: {
          errors: validationIssues
            .filter((v) => v.severity === BackendValidationSeverity.Error)
            .map((v) => getValidationMessage(v, langTools)),
          warnings: validationIssues
            .filter((v) => v.severity === BackendValidationSeverity.Warning)
            .map((v) => getValidationMessage(v, langTools)),
        },
      };
    } else {
      validations = getFileUploadComponentValidations('upload', langTools);
    }

    yield put(
      ValidationActions.updateComponentValidations({
        componentId,
        pageKey: currentView,
        validationResult: { validations },
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
