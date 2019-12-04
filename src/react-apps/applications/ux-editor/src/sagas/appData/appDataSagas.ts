import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import * as AppDataActions from '../../actions/appDataActions/actions';
import AppDataActionDispatchers from '../../actions/appDataActions/appDataActionDispatcher';
import * as AppDataActionTypes from '../../actions/appDataActions/appDataActionTypes';
import { get } from '../../utils/networking';

function* fetchDataModelSaga({
  url,
}: AppDataActions.IFetchDataModelAction): SagaIterator {
  try {
    const dataModel = yield call(get, url);
    const dataModelFields: IDataModelFieldElement[] = [];
    for (const dataModelField in dataModel.elements) {
      if (!dataModelField) {
        continue;
      }
      dataModelFields.push(dataModel.elements[dataModelField]);
    }
    yield call(
      AppDataActionDispatchers.fetchDataModelFulfilled,
      dataModelFields,
    );
  } catch (err) {
    yield call(AppDataActionDispatchers.fetchDataModelRejected, err);
  }
}

function* fetchRuleModelSaga({
  url,
}: AppDataActions.IFetchRuleModelAction): SagaIterator {
  try {
    const ruleModel = yield call(get, url);
    const ruleModelFields: IRuleModelFieldElement[] = [];
    const scriptEle = window.document.createElement('script');
    scriptEle.innerHTML = ruleModel;
    window.document.body.appendChild(scriptEle);
    for (const functionName of Object.keys((window as any).ruleHandlerObject)) {
      const innerFuncObj = {
        name: functionName,
        inputs: (window as any).ruleHandlerHelper[functionName](),
        type: 'rule',
      };
      ruleModelFields.push(innerFuncObj);
    }
    for (const functionName of Object.keys((window as any).conditionalRuleHandlerObject)) {
      const innerFuncObj = {
        name: functionName,
        inputs: (window as any).conditionalRuleHandlerHelper[functionName](),
        type: 'condition',
      };
      ruleModelFields.push(innerFuncObj);
    }
    yield call(
      AppDataActionDispatchers.fetchRuleModelFulfilled,
      ruleModelFields,
    );
  } catch (err) {
    yield call(AppDataActionDispatchers.fetchRuleModelRejected, err);
  }
}

export function* watchFetchDataModelSaga(): SagaIterator {
  yield takeLatest(AppDataActionTypes.FETCH_DATA_MODEL, fetchDataModelSaga);
}

export function* loadTextResourcesSaga({
  url,
}: AppDataActions.ILoadTextResourcesAction): SagaIterator {
  try {
    const textResources = yield call(get, url);
    yield call(AppDataActionDispatchers.loadTextResourcesFulfilled, textResources);
  } catch (err) {
    yield call(AppDataActionDispatchers.loadTextResourcesRejected, err);
  }
}

export function* watchLoadTextResourcesSaga(): SagaIterator {
  yield takeLatest(AppDataActionTypes.LOAD_TEXT_RESOURCES, loadTextResourcesSaga);
}

export function* watchFetchRuleModelSaga(): SagaIterator {
  yield takeLatest(AppDataActionTypes.FETCH_RULE_MODEL, fetchRuleModelSaga);
}
export function* fetchLanguageSaga({
  url,
  languageCode,
}: AppDataActions.IFetchLanguageAction): SagaIterator {
  try {
    const language = yield call(get, url, { params: { languageCode } });
    yield call(AppDataActionDispatchers.fetchLanguageFulfilled, language);
  } catch (err) {
    yield call(AppDataActionDispatchers.fetchLanguageRecjeted, err);
  }
}

export function* watchFetchLanguageSaga(): SagaIterator {
  yield takeLatest(
    AppDataActionTypes.FETCH_LANGUAGE,
    fetchLanguageSaga,
  );
}
