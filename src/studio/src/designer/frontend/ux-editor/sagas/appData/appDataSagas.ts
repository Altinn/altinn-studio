import { post } from 'app-shared/utils/networking';
import { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import * as AppDataActions from '../../actions/appDataActions/actions';
import AppDataActionDispatchers from '../../actions/appDataActions/appDataActionDispatcher';
import * as AppDataActionTypes from '../../actions/appDataActions/appDataActionTypes';
import { get } from '../../utils/networking';
import { ILoadTextResourcesAction,
  loadTextResources,
  loadTextResourcesFulfilled,
  loadTextResourcesRejected,
  addTextResources,
  addTextResourcesFulfilled,
  addTextResourcesRejected } from '../../features/appData/textResources/textResourcesSlice';
import { getAddTextResourcesUrl } from '../../utils/urlHelper';

function* fetchDataModelSaga({
  url,
}: AppDataActions.IFetchDataModelAction): SagaIterator {
  try {
    const dataModel: any = yield call(get, url);
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

export function* loadTextResourcesSaga({ payload }: ILoadTextResourcesAction): SagaIterator {
  try {
    const { url } = payload;
    const textResources = yield call(get, url);
    yield put(loadTextResourcesFulfilled({ textResources }));
  } catch (error) {
    yield put(loadTextResourcesRejected({ error }));
  }
}

export function* watchLoadTextResourcesSaga(): SagaIterator {
  yield takeLatest(loadTextResources.type, loadTextResourcesSaga);
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

export function* addTextResourcesSaga({ payload }: any): SagaIterator {
  try {
    const { textResources } = payload;
    const url = getAddTextResourcesUrl();
    yield call(post, url, textResources);
    yield put(addTextResourcesFulfilled());
  } catch (error) {
    yield put(addTextResourcesRejected({ error }));
  }
}

export function* watchAddTextResourcesSaga(): SagaIterator {
  yield takeLatest(addTextResources.type, addTextResourcesSaga);
}
