import { get, post } from 'app-shared/utils/networking';
import { SagaIterator } from 'redux-saga';
import { call, fork, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import {
  addTextResources,
  addTextResourcesFulfilled,
  addTextResourcesRejected,
  ILoadTextResourcesAction,
  loadTextResources,
  loadTextResourcesFulfilled,
  loadTextResourcesRejected,
} from './textResources/textResourcesSlice';
import {
  getAddTextResourcesUrl,
  getFetchDataModelUrl,
  getFetchRuleModelUrl,
} from '../../utils/urlHelper';
import {
  fetchDataModel,
  fetchDataModelFulfilled,
  fetchDataModelRejected,
} from './dataModel/dataModelSlice';
import {
  fetchLanguage,
  fetchLanguageFulfilled,
  fetchLanguageRejected,
  IFetchLanguage,
} from './language/languageSlice';
import {
  fetchRuleModel,
  fetchRuleModelFulfilled,
  fetchRuleModelRejected,
} from './ruleModel/ruleModelSlice';
import type {
  IDataModelFieldElement,
  IRuleModelFieldElement,
} from '../../types/global';
import {frontendLangPath} from "app-shared/api-paths";

function* fetchDataModelSaga(): SagaIterator {
  try {
    const url = getFetchDataModelUrl();
    const dataModel: any = yield call(get, url);
    const dataModelFields: IDataModelFieldElement[] = [];
    Object.keys(dataModel.elements).forEach((dataModelField) => {
      if (dataModelField) {
        dataModelFields.push(dataModel.elements[dataModelField]);
      }
    });

    yield put(fetchDataModelFulfilled({ dataModel: dataModelFields }));
  } catch (error) {
    yield put(fetchDataModelRejected({ error }));
  }
}

export function* watchFetchDataModelSaga(): SagaIterator {
  yield takeLatest(fetchDataModel, fetchDataModelSaga);
}

function* fetchRuleModelSaga(): SagaIterator {
  try {
    const ruleModel = yield call(get, getFetchRuleModelUrl());
    const ruleModelFields: IRuleModelFieldElement[] = [];
    const scriptEle = window.document.createElement('script');
    scriptEle.innerHTML = ruleModel;
    window.document.body.appendChild(scriptEle);
    Object.keys((window as any).ruleHandlerObject).forEach((functionName) => {
      const innerFuncObj = {
        name: functionName,
        inputs: (window as any).ruleHandlerHelper[functionName](),
        type: 'rule',
      };
      ruleModelFields.push(innerFuncObj);
    });

    Object.keys((window as any).conditionalRuleHandlerObject).forEach(
      (functionName) => {
        const innerFuncObj = {
          name: functionName,
          inputs: (window as any).conditionalRuleHandlerHelper[functionName](),
          type: 'condition',
        };
        ruleModelFields.push(innerFuncObj);
      },
    );

    yield put(fetchRuleModelFulfilled({ ruleModel: ruleModelFields }));
  } catch (error) {
    yield put(fetchRuleModelRejected({ error }));
  }
}

export function* watchFetchRuleModelSaga(): SagaIterator {
  yield takeLatest(fetchRuleModel, fetchRuleModelSaga);
}

export function* loadTextResourcesSaga({
  payload,
}: ILoadTextResourcesAction): SagaIterator {
  try {
    const { url } = payload;
    const textResources = yield call(get, url);
    yield put(loadTextResourcesFulfilled({ textResources }));
  } catch (error) {
    yield put(loadTextResourcesRejected({ error }));
  }
}

export function* watchLoadTextResourcesSaga(): SagaIterator {
  yield takeLatest(loadTextResources, loadTextResourcesSaga);
}

export function* fetchLanguageSaga({
  payload,
}: PayloadAction<IFetchLanguage>): SagaIterator {
  try {
    const { languageCode } = payload;
    const language = yield call(get, frontendLangPath(languageCode));
    yield put(fetchLanguageFulfilled({ language }));
  } catch (error) {
    yield put(fetchLanguageRejected({ error }));
  }
}

export function* watchFetchLanguageSaga(): SagaIterator {
  yield takeLatest(fetchLanguage, fetchLanguageSaga);
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

export default function* appDataSagas(): SagaIterator {
  yield fork(watchFetchDataModelSaga);
  yield fork(watchLoadTextResourcesSaga);
  yield fork(watchFetchRuleModelSaga);
  yield fork(watchFetchLanguageSaga);
  yield fork(watchAddTextResourcesSaga);
}
