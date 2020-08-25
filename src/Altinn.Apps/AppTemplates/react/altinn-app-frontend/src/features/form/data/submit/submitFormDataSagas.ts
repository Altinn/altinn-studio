import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import { getCurrentTaskDataTypeId, get, put } from 'altinn-shared/utils';
import { IRuntimeState } from 'src/types';
import ProcessDispatcher from '../../../../resources/process/processDispatcher';
import { convertDataBindingToModel, filterOutInvalidData } from '../../../../utils/databindings';
import { dataElementUrl, getValidationUrl } from '../../../../utils/urlHelper';
import FormDataActions from '../formDataActions';
import { ISubmitDataAction } from './submitFormDataActions';
import * as FormDataActionTypes from '../formDataActionTypes';

function* submitFormSaga({ apiMode }: ISubmitDataAction): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const model = convertDataBindingToModel(state.formData.formData);

    // updates the default data element
    const defaultDataElementGuid = getCurrentTaskDataTypeId(
      state.applicationMetadata.applicationMetadata,
      state.instanceData.instance,
    );
    try {
      yield call(put, dataElementUrl(defaultDataElementGuid), model);
    } catch (err) {
      if (err.response && err.response.status === 303) {
        yield call(FormDataActions.fetchFormData, dataElementUrl(err.response.data.id));
      } else {
        throw err;
      }
    }

    if (apiMode === 'Complete') {
      // run validations against the datamodel
      const instanceId = state.instanceData.instance.id;
      const serverValidation: any = yield call(get, getValidationUrl(instanceId));

      if (serverValidation && serverValidation.length > 0) {
        // we have validation errors, should not be able to submit
        return yield call(FormDataActions.submitFormDataRejected, null);
      }
      // data has no validation errors, we complete the current step
      yield call(ProcessDispatcher.completeProcess);
    }
    yield call(FormDataActions.submitFormDataFulfilled);
  } catch (err) {
    console.error(err);
    yield call(FormDataActions.submitFormDataRejected, err);
  }
}

// eslint-disable-next-line consistent-return
function* saveFormDataSaga(): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    // updates the default data element
    const defaultDataElementGuid = getCurrentTaskDataTypeId(
      state.applicationMetadata.applicationMetadata,
      state.instanceData.instance,
    );

    const model = convertDataBindingToModel(
      filterOutInvalidData(state.formData.formData, state.formValidations.invalidDataTypes || []),
    );

    try {
      yield call(put, dataElementUrl(defaultDataElementGuid), model);
    } catch (err) {
      if (err.response && err.response.status === 303) {
        yield call(FormDataActions.fetchFormData, dataElementUrl(err.response.data.id));
      } else {
        throw err;
      }
    }

    yield call(FormDataActions.submitFormDataFulfilled);
  } catch (err) {
    console.error(err);
    yield call(FormDataActions.submitFormDataRejected, err);
  }
}

export function* watchSubmitFormSaga(): SagaIterator {
  yield takeLatest(FormDataActionTypes.SUBMIT_FORM_DATA, submitFormSaga);
}

export function* watchSaveFormDataSaga(): SagaIterator {
  yield takeLatest(FormDataActionTypes.SAVE_FORM_DATA, saveFormDataSaga);
}
