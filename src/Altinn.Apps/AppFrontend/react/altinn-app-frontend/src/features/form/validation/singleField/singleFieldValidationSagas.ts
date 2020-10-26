import { SagaIterator } from 'redux-saga';
import { call, select, take, takeLatest } from 'redux-saga/effects';
import { AxiosRequestConfig } from 'axios';
import { IRuntimeStore } from 'src/types';
import { IRuntimeState } from 'src/types';
import { get } from '../../../../utils/networking';
import { mapDataElementValidationToRedux } from '../../../../utils/validation';
import Actions from '../validationActions';
import { IRunSingleFieldValidationAction } from './singleFieldValidationActions';
import * as ActionTypes from '../validationActionTypes';
import { getValidationUrl } from 'src/utils/urlHelper';
import { ILayoutState } from '../../layout/formLayoutReducer';
import FormValidationActions from '../validationActions';
import FormDataActions from '../../data/formDataActions';

export function* runSingleFieldValidationSaga({
  dataModelBinding,
}: IRunSingleFieldValidationAction): SagaIterator {
    const state: IRuntimeState = yield select();
    const url = getValidationUrl(state.instanceData.instance.id);

    const options: AxiosRequestConfig = {
      headers: {
        ValidationTriggerField: dataModelBinding,
      },
    };

    try{
    const serverValidation: any = yield call(get, url, options);
    const mappedValidations =
        mapDataElementValidationToRedux(serverValidation, state.formLayout.layouts, state.textResources.resources);
        FormValidationActions.updateValidations(mappedValidations);
        yield call(Actions.runSingleFieldValidationFulfilled, mappedValidations)
    }
  catch(err){
      yield call(Actions.runSingleFieldValidationRejected, err);
    }
}

export function* watchRunSingleFieldValidationSaga(): SagaIterator {
  yield takeLatest(ActionTypes.RUN_SINGLE_FIELD_VALIDATION, runSingleFieldValidationSaga);
  yield take(FormDataActions.UPDATE_FORM_DATA_FULFILLED);
}
