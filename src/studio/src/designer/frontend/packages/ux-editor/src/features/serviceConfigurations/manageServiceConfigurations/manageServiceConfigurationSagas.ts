import type { SagaIterator } from 'redux-saga';
import { call, delay, put, select, takeLatest } from 'redux-saga/effects';
import postMessages from 'app-shared/utils/postMessages';
import {
  addConditionalRenderingConnection,
  addRuleConnection,
  deleteConditionalRenderingConnnection,
  deleteRuleConnnection,
  fetchServiceConfiguration,
  fetchServiceConfigurationFulfilled,
  fetchServiceConfigurationRejected,
  saveServiceConfiguration,
  saveServiceConfigurationFulfilled,
  saveServiceConfigurationRejected,
  setConditionalRenderingConnections,
  setRuleConnections,
} from '../serviceConfigurationSlice';
import type { IServiceConfigurationState } from '../serviceConfigurationTypes';
import { get, post } from 'app-shared/utils/networking';
import { getFetchRuleConfigurationUrl, getSveSerConfUrl } from '../../../utils/urlHelper';
import type { IAppState } from '../../../types/global';

const selectServiceConfiguration = (state: IAppState): IServiceConfigurationState =>
  state.serviceConfigurations;

export function* watchFetchServiceConfigurationSaga(): SagaIterator {
  yield takeLatest(fetchServiceConfiguration, fetchJsonFileSaga);
}

export function* fetchJsonFileSaga(): SagaIterator {
  try {
    const serviceConfiguration: any = yield call(get, getFetchRuleConfigurationUrl());
    yield put(fetchServiceConfigurationFulfilled());
    yield put(
      setConditionalRenderingConnections({
        conditionalRenderingConnections: serviceConfiguration?.data?.conditionalRendering,
      })
    );
    yield put(
      setRuleConnections({
        ruleConnections: serviceConfiguration?.data?.ruleConnection,
      })
    );
  } catch (error) {
    yield put(fetchServiceConfigurationRejected({ error }));
  }
}

export function* watchSaveServiceConfigurationSaga(): SagaIterator {
  yield takeLatest(
    [
      saveServiceConfiguration,
      addConditionalRenderingConnection,
      addRuleConnection,
      deleteConditionalRenderingConnnection,
      deleteRuleConnnection,
    ],
    saveServiceConfigurationSaga
  );
}

export function* saveServiceConfigurationSaga(): SagaIterator {
  try {
    delay(200);
    const serviceConfigurationState: IServiceConfigurationState = yield select(
      selectServiceConfiguration
    );

    // create new serviceConfigurations object without manageServiceConfiguration status
    const newServiceConfigurationsObj = Object.keys(serviceConfigurationState)
      .filter((elem: any) => elem !== 'manageServiceConfiguration')
      .reduce((acc: any, elem: any) => {
        acc[elem] = serviceConfigurationState[elem];
        return acc;
      }, {});

    yield call(post, getSveSerConfUrl(), {
      data: {
        ...newServiceConfigurationsObj,
      },
    });

    yield put(saveServiceConfigurationFulfilled());
    window.postMessage(postMessages.filesAreSaved, window.location.href);
  } catch (error) {
    yield put(saveServiceConfigurationRejected({ error }));
  }
}
