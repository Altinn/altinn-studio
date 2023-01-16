import { get, post, put as restPut } from 'app-shared/utils/networking';
import type { SagaIterator } from 'redux-saga';
import { call, fork, put, takeLatest } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  ILoadLanguagesAction,
  ILoadTextResourcesAction,
  IUpsertTextResources,
  addTextResources,
  addTextResourcesFulfilled,
  addTextResourcesRejected,
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
  getAddTextResourcesUrl,
  getFetchDataModelUrl,
  getFetchRuleModelUrl,
  getPutTextResourcesUrl,
} from '../../utils/urlHelper';
import {
  fetchDataModel,
  fetchDataModelFulfilled,
  fetchDataModelRejected,
} from './dataModel/dataModelSlice';
import type { IFetchLanguage } from './language/languageSlice';
import {
  fetchLanguage,
  fetchLanguageFulfilled,
  fetchLanguageRejected,
} from './language/languageSlice';
import {
  fetchRuleModel,
  fetchRuleModelFulfilled,
  fetchRuleModelRejected,
} from './ruleModel/ruleModelSlice';
import type { IDataModelFieldElement, IRuleModelFieldElement } from '../../types/global';
import { frontendLangPath } from 'app-shared/api-paths';

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

export function* fetchLanguageSaga({ payload }: PayloadAction<IFetchLanguage>): SagaIterator {
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

export function* upsertTextResourcesSaga({
  payload,
}: PayloadAction<IUpsertTextResources>): SagaIterator {
  try {
    const { language, textResources } = payload;
    yield call(restPut, getPutTextResourcesUrl(language), textResources);
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
  yield fork(watchFetchLanguageSaga);
  yield fork(watchAddTextResourcesSaga);
  yield fork(watchUpsertTextResourcesSaga);
}
