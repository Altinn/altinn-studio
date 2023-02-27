import { get, put as restPut } from 'app-shared/utils/networking';
import type { SagaIterator } from 'redux-saga';
import { call, fork, put, takeLatest } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  ILoadLanguagesAction,
  ILoadTextResourcesAction,
  IUpsertTextResources,
  loadLanguages,
  loadLanguagesFulfilled,
  loadLanguagesRejected,
  loadTextResources,
  loadTextResourcesFulfilled,
  loadTextResourcesRejected,
  upsertTextResources,
  upsertTextResourcesFulfilled,
  upsertTextResourcesRejected,
} from './textResources/textResourcesSlice';
import {
  fetchDataModel,
  fetchDataModelFulfilled,
  fetchDataModelRejected,
} from './dataModel/dataModelSlice';
import {
  fetchRuleModel,
  fetchRuleModelFulfilled,
  fetchRuleModelRejected,
} from './ruleModel/ruleModelSlice';
import type { IDataModelFieldElement, IRuleModelFieldElement } from '../../types/global';
import {
  textResourcesPath,
  ruleHandlerPath,
  datamodelMetadataPath
} from 'app-shared/api-paths';

function* fetchDataModelSaga({ payload }: PayloadAction<{org, app}>): SagaIterator {
  const { org, app } = payload;
  try {
    const url = datamodelMetadataPath(org, app);
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

function* fetchRuleModelSaga({ payload }: PayloadAction<{org, app}>): SagaIterator {
  const { org, app } = payload;
  try {
    const ruleModel = yield call(get, ruleHandlerPath(org, app));
    const ruleModelFields: IRuleModelFieldElement[] = [];
    const scriptEle = window.document.createElement('script');
    scriptEle.innerHTML = ruleModel;
    window.document.body.appendChild(scriptEle);

    const {
      ruleHandlerObject,
      conditionalRuleHandlerObject,
      ruleHandlerHelper,
      conditionalRuleHandlerHelper,
    } = window as unknown as {
      ruleHandlerObject: object;
      conditionalRuleHandlerObject: object;
      ruleHandlerHelper: object;
      conditionalRuleHandlerHelper: object;
    };

    Object.keys(ruleHandlerObject).forEach((functionName) => {
      if (typeof ruleHandlerHelper[functionName] === 'function') {
        const innerFuncObj = {
          name: functionName,
          inputs: ruleHandlerHelper[functionName](),
          type: 'rule',
        };
        ruleModelFields.push(innerFuncObj);
      }
    });

    Object.keys(conditionalRuleHandlerObject).forEach((functionName) => {
      if (typeof conditionalRuleHandlerHelper[functionName] === 'function') {
        const innerFuncObj = {
          name: functionName,
          inputs: conditionalRuleHandlerHelper[functionName](),
          type: 'condition',
        };
        ruleModelFields.push(innerFuncObj);
      }
    });

    yield put(fetchRuleModelFulfilled({ ruleModel: ruleModelFields }));
  } catch (error) {
    yield put(fetchRuleModelRejected({ error }));
  }
}

export function* watchFetchRuleModelSaga(): SagaIterator {
  yield takeLatest(fetchRuleModel, fetchRuleModelSaga);
}

export function* loadTextResourcesSaga({ payload }: ILoadTextResourcesAction): SagaIterator {
  try {
    const { languagesUrl, textResourcesUrl } = payload;
    const languages = yield call(get, languagesUrl);
    const textResources = {};
    for (const language of languages) {
      const { resources } = yield call(get, textResourcesUrl(language));
      textResources[language] = resources;
    }
    yield put(loadTextResourcesFulfilled({ textResources }));
  } catch (error) {
    yield put(loadTextResourcesRejected({ error }));
  }
}

export function* watchLoadTextResourcesSaga(): SagaIterator {
  yield takeLatest(loadTextResources, loadTextResourcesSaga);
}

export function* loadLanguagesSaga({ payload }: ILoadLanguagesAction): SagaIterator {
  try {
    const { url } = payload;
    const languages = yield call(get, url);
    yield put(loadLanguagesFulfilled({ languages }));
  } catch (error) {
    yield put(loadLanguagesRejected({ error }));
  }
}

export function* watchLoadLanguagesSaga(): SagaIterator {
  yield takeLatest(loadLanguages, loadLanguagesSaga);
}

export function* upsertTextResourcesSaga({
  payload,
}: PayloadAction<IUpsertTextResources>): SagaIterator {
  try {
    const { language, textResources } = payload;
    yield call(restPut, textResourcesPath(payload.org, payload.app, language), textResources);
    yield put(upsertTextResourcesFulfilled());
  } catch (error) {
    yield put(upsertTextResourcesRejected({ error }));
  }
}

export function* watchUpsertTextResourcesSaga(): SagaIterator {
  yield takeLatest(upsertTextResources.type, upsertTextResourcesSaga);
}

export default function* appDataSagas(): SagaIterator {
  yield fork(watchFetchDataModelSaga);
  yield fork(watchLoadTextResourcesSaga);
  yield fork(watchLoadLanguagesSaga);
  yield fork(watchFetchRuleModelSaga);
  yield fork(watchUpsertTextResourcesSaga);
}
