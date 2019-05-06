import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';

import WorkflowActions, * as WorkFlowActions from '../../../workflow/actions';
import FormDataActions from '../../actions';
import {
  ISubmitDataAction,
} from '../../actions/submit';
import * as FormDataActionTypes from '../../actions/types';
import { IFormDataState } from '../../reducer';

import { convertDataBindingToModel } from '../../../../../utils/databindings';
import { put } from '../../../../../utils/networking';
import { validateFormData } from '../../../../../utils/validation';
import { IDataModelState } from '../../../datamodell/reducer';
import { ILayoutState } from '../../../layout/reducer';

const FormDataSelector: (state: any) => IFormDataState = (state: any) => state.formData;
const DataModelSelector: (state: any) => IDataModelState = (state: any) => state.formDataModel;
const LayoutSelector: (state: any) => ILayoutState = (state: any) => state.formLayout;

function* submitFormSaga({ url, apiMode }: ISubmitDataAction): SagaIterator {
  try {
    const formDataState: IFormDataState = yield select(FormDataSelector);
    const dataModelState: IDataModelState = yield select(DataModelSelector);
    const layoutState: ILayoutState = yield select(LayoutSelector);
    const model = convertDataBindingToModel(formDataState.formData, dataModelState.dataModel);
    const validationErrors = validateFormData(formDataState.formData, dataModelState.dataModel, layoutState.layout);
    if (Object.keys(validationErrors).length === 0) {
      const result = yield call(put, url, apiMode || 'Update', { body: model });
      console.log('result', result);
      yield call(FormDataActions.submitFormDataFulfilled);
      if (result.status === 0 && result.nextState) {
        // TODO: update workflow state when #1434 is done  (WorkflowActions.setCurrentState(result.nextState); ish)
      }
      if (result.status === 0 && result.nextStepUrl && !result.nextStepUrl.includes('#Preview')) {
        // If next step is placed somewhere other then the SPA, for instance payment, we must redirect.
        if (window.location.pathname.split('/')[1].toLowerCase() === 'runtime') {
          window.location.replace(`${window.location.origin}${result.nextStepUrl}`);
        }
      }
    } else {
      // TODO: update state with validation errors when issue #1441 is done
    }
  } catch (err) {
    console.error(err);
    yield call(FormDataActions.submitFormDataRejected, err);
    if (err.response && err.response.status === 303) {
      yield call(FormDataActions.fetchFormData, url);
    } else if (err.response && err.response.data &&
      (err.response.data.status === 1 || err.response.data.status === 2)) {
      // TODO: update state with validation errors when issue #1441 is done
    }
  }
}

export function* watchSubmitFormSaga(): SagaIterator {
  yield takeLatest(FormDataActionTypes.SUBMIT_FORM_DATA, submitFormSaga);
}
