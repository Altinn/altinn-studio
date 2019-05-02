import { AxiosRequestConfig } from 'axios';
import { SagaIterator } from 'redux-saga';
import { call, select, takeEvery, takeLatest } from 'redux-saga/effects';
import FormDesignerActionDispatchers from '../../actions/formDesignerActions/formDesignerActionDispatcher';
import * as FormFillerActions from '../../actions/formFillerActions/actions/index';
import FormFillerActionDispatcher from '../../actions/formFillerActions/formFillerActionDispatcher';
import * as FormFillerActionTypes from '../../actions/formFillerActions/formFillerActionTypes';
import WorkflowActionDispatcher from '../../actions/workflowActions/worflowActionDispatcher';
import { getFileUploadComponentValidations } from '../../components/base/FileUploadComponent';
import { IAppDataState } from '../../reducers/appDataReducer';
import { mapAttachmentListApiResponseToAttachments } from '../../utils/attachment';
import { convertDataBindingToModel, convertModelToDataBinding } from '../../utils/databindings';
import { get, post, put } from '../../utils/networking';
import * as Validator from '../../utils/validation';

const selectAppData = (state: IAppState): IAppDataState => state.appData;

export function* updateFormDataSaga({
  formData,
  componentID,
  dataModelElement,
  dataModelBinding,
}: FormFillerActions.IUpdateFormDataAction): SagaIterator {
  try {
    const state: IAppState = yield select();
    if (!dataModelElement) {
      return;
    }

    const validationErrors = Validator.validateDataModel(
      formData,
      dataModelElement,
      state.formDesigner.layout.components[componentID],
    );

    yield call(
      FormFillerActionDispatcher.updateFormDataFulfilled,
      componentID,
      formData,
      dataModelBinding,
      validationErrors,
    );
  } catch (err) {
    yield call(FormFillerActionDispatcher.updateFormDataRejected, err);
  }
}

export function* watchUpdateFormDataSaga(): SagaIterator {
  yield takeLatest(FormFillerActionTypes.UPDATE_FORM_DATA, updateFormDataSaga);
}

export function* submitFormDataSaga({ url, apiMode }: FormFillerActions.ISubmitFormDataAction): SagaIterator {
  try {
    const state: IAppState = yield select();

    // Validating entire form before trying to commit
    const valErrors = Validator.validateFormData(state.formFiller.formData, state.appData.dataModel.model,
      state.formDesigner.layout.components);
    if (Object.keys(valErrors).length === 0) {
      const apiResult = yield call(put, url, apiMode || 'Update', convertDataBindingToModel(state.formFiller.formData,
        state.appData.dataModel.model));
      yield call(FormFillerActionDispatcher.submitFormDataFulfilled, apiResult);
      if (apiResult.status === 0 && apiResult.nextState) {
        WorkflowActionDispatcher.setCurrentState(apiResult.nextState);
      }
      if (apiResult.status === 0 && apiResult.nextStepUrl && !apiResult.nextStepUrl.contains('#Preview')) {
        // If next step is placed somewhere other then the SPA, for instance payment, we must redirect.
        // This is just a "POC" that this can be done
        if (window.location.pathname.split('/')[1].toLowerCase() === 'runtime') {
          window.location.replace(`${window.location.origin}${apiResult.nextStepUrl}`);
        }
      }
    } else {
      // Update validationError state if schema contains errors
      yield call(FormFillerActionDispatcher.updateValidationErrors, valErrors);
    }
  } catch (err) {
    if (err.response && err.response.status === 303) {
      yield call(FormFillerActionDispatcher.submitFormDataFulfilled, err);
      yield call(FormFillerActionDispatcher.fetchFormData, url + '/Read');
    } else if (err.response && err.response.data &&
      (err.response.data.status === 1 || err.response.data.status === 2)) {
      // Update validationError state if response contains validation errors
      const state: IAppState = yield select();
      const validationResults =
        Validator.mapApiValidationResultToLayout(err.response.data.validationResult, state.formDesigner.layout);
      yield call(FormFillerActionDispatcher.updateValidationErrors, validationResults);
      yield call(FormFillerActionDispatcher.submitFormDataRejected, err);
    } else {
      yield call(FormFillerActionDispatcher.submitFormDataRejected, err);
    }
  }
}

export function* watchSubmitFormDataSaga(): SagaIterator {
  yield takeLatest(FormFillerActionTypes.SUBMIT_FORM_DATA, submitFormDataSaga);
}

export function* fetchFormDataSaga({ url }: FormFillerActions.IFetchFormDataAction): SagaIterator {
  try {
    const formData = yield call(get, url);
    const appDataState: IAppDataState = yield select(selectAppData);
    yield call(
      FormFillerActionDispatcher.fetchFormDataFulfilled,
      convertModelToDataBinding(formData, appDataState.dataModel.model),
    );
    yield call(FormDesignerActionDispatchers.generateRepeatingGroupsAction);
  } catch (err) {
    yield call(FormFillerActionDispatcher.fetchFormDataRejected, err);
  }
}

export function* watchFetchFormDataSaga(): SagaIterator {
  yield takeLatest(FormFillerActionTypes.FETCH_FORM_DATA, fetchFormDataSaga);
}

export function* resetFormDataSaga({ url }: FormFillerActions.IResetFormDataAction): SagaIterator {
  try {
    const formData = yield call(get, url);
    const appDataState: IAppDataState = yield select(selectAppData);
    yield call(FormFillerActionDispatcher.resetFormDataFulfilled,
      convertModelToDataBinding(formData, appDataState.dataModel.model));
    yield call(FormDesignerActionDispatchers.generateRepeatingGroupsAction);
  } catch (err) {
    yield call(FormFillerActionDispatcher.fetchFormDataRejected, err);
  }
}

export function* watchResetFormDataSaga(): SagaIterator {
  yield takeLatest(FormFillerActionTypes.RESET_FORM_DATA, resetFormDataSaga);
}

export function* runSingleFieldValidationSaga({
  url,
  dataModelBinding,
}: FormFillerActions.IRunSingleFieldValidationAction): SagaIterator {
  const state: IAppState = yield select();
  try {
    const requestBody = convertDataBindingToModel(state.formFiller.formData, state.appData.dataModel.model);
    const config: AxiosRequestConfig = {
      headers: {
        ValidationTriggerField: dataModelBinding,
      },
    };
    const response = yield call(put, url, 'Validate', requestBody, config, dataModelBinding);
    if (response && response.validationResult) {
      // Update validationError state
      const validationErrors: any = response.validationResult.errors;
      yield call(FormFillerActionDispatcher.runSingleFieldValidationFulfilled, validationErrors);
    }
  } catch (err) {
    yield call(FormFillerActionDispatcher.runSingleFieldValidationRejected, err);
  }
}

export function* watchRunSingleFieldValidationSaga(): SagaIterator {
  yield takeLatest(FormFillerActionTypes.RUN_SINGLE_FIELD_VALIDATION, runSingleFieldValidationSaga);
}

export function* completeAndSendInFormSaga({ url }: FormFillerActions.ICompleteAndSendInForm): SagaIterator {
  try {
    const response = yield call(post, url);
    if (response.data.status === 0) {
      yield call(FormFillerActionDispatcher.completeAndSendInFormFulfilled);
      yield call(WorkflowActionDispatcher.setCurrentState, response.data.nextState);
    } else {
      yield call(FormFillerActionDispatcher.completeAndSendInFormRejected);
    }
  } catch (err) {
    yield call(FormFillerActionDispatcher.completeAndSendInFormRejected);
  }
}

export function* watchCompleteAndSendInFormSaga(): SagaIterator {
  yield takeLatest(FormFillerActionTypes.COMPLETE_AND_SEND_IN_FORM, completeAndSendInFormSaga);
}

export function* uploadAttachmentSaga(
  { file, attachmentType, tmpAttachmentId, componentId }: FormFillerActions.IUploadAttachmentAction): SagaIterator {
  const state: IAppState = yield select();
  const language = state.appData.language.language;
  try {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service, instanceId, reportee } = altinnWindow;
    const servicePath = `${org}/${service}`;
    const data = new FormData();
    data.append('file', file);

    // tslint:disable-next-line:max-line-length
    const fileUploadUrl = `${altinnWindow.location.origin}/runtime/api/attachment/${reportee}/${servicePath}/${instanceId}/SaveFormAttachment?attachmentType=${attachmentType}&attachmentName=${file.name}`;
    const response = yield call(post, fileUploadUrl, null, data);
    if (response.status === 200) {
      const attachment: IAttachment
        = { name: file.name, size: file.size, uploaded: true, id: response.data.id, deleting: false };
      yield call(FormFillerActionDispatcher.uploadAttachmentFulfilled,
        attachment, attachmentType, tmpAttachmentId, componentId);
    } else {
      const validationMessages = getFileUploadComponentValidations('upload', language);
      yield call(FormFillerActionDispatcher.uploadAttachmentRejected,
        tmpAttachmentId, attachmentType, componentId, validationMessages);
    }
  } catch (err) {
    console.error(err);
    const validationMessages = getFileUploadComponentValidations('upload', language);
    yield call(FormFillerActionDispatcher.uploadAttachmentRejected,
      tmpAttachmentId, attachmentType, componentId, validationMessages);
  }
}

export function* watchUploadAttachmentSaga(): SagaIterator {
  yield takeEvery(FormFillerActionTypes.UPLOAD_ATTACHMENT, uploadAttachmentSaga);
}

export function* watchDeleteAttachmentSaga(): SagaIterator {
  yield takeEvery(FormFillerActionTypes.DELETE_ATTACHMENT, deleteAttachmentSaga);
}

export function* deleteAttachmentSaga(
  { attachment, attachmentType, componentId }: FormFillerActions.IDeleteAttachmentAction): SagaIterator {
  const state: IAppState = yield select();
  const language = state.appData.language.language;
  try {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service, instanceId, reportee } = altinnWindow;
    const servicePath = `${org}/${service}`;
    // tslint:disable-next-line:max-line-length
    const deleteUrl = `${altinnWindow.location.origin}/runtime/api/attachment/${reportee}/${servicePath}/${instanceId}/DeleteFormAttachment?attachmentType=${attachmentType}&attachmentId=${attachment.id}`;
    const response = yield call(post, deleteUrl);
    if (response.status === 200) {
      yield call(FormFillerActionDispatcher.deleteAttachmentFulfilled, attachment.id, attachmentType, componentId);
    } else {
      const validationMessages = getFileUploadComponentValidations('delete', language);
      yield call(FormFillerActionDispatcher.deleteAttachmentRejected,
        attachment, attachmentType, componentId, validationMessages);

    }
  } catch (err) {
    const validationMessages = getFileUploadComponentValidations('delete', language);
    yield call(FormFillerActionDispatcher.deleteAttachmentRejected,
      attachment, attachmentType, componentId, validationMessages);
    console.error(err);
  }
}

export function* watchFetchAttachmentsSaga(): SagaIterator {
  yield takeLatest(FormFillerActionTypes.FETCH_ATTACHMENTS, fetchAttachments);
}

export function* fetchAttachments(): SagaIterator {
  try {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service, instanceId, reportee } = altinnWindow;
    const servicePath = `${org}/${service}`;
    // tslint:disable-next-line:max-line-length
    const attachmentListUrl = `${altinnWindow.location.origin}/runtime/api/attachment/${reportee}/${servicePath}/${instanceId}/GetFormAttachments`;
    const response = yield call(get, attachmentListUrl);
    const attachments: IAttachments = mapAttachmentListApiResponseToAttachments(response);
    yield call(FormFillerActionDispatcher.fetchAttachmentsFulfilled, attachments);
  } catch (err) {
    yield call(FormFillerActionDispatcher.fetchAttachmentsRejected, err);
  }
}
