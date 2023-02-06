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
import { ruleConfigPath } from 'app-shared/api-paths';
import type { IAppState } from '../../../types/global';
import { PayloadAction } from '@reduxjs/toolkit';

const selectServiceConfiguration = (state: IAppState): IServiceConfigurationState =>
  state.serviceConfigurations;

export function* watchFetchServiceConfigurationSaga(): SagaIterator {
  yield takeLatest(fetchServiceConfiguration, fetchJsonFileSaga);
}

export function* fetchJsonFileSaga({ payload }: PayloadAction<{org, app}>): SagaIterator {
  const { org, app } = payload;
  try {
    const serviceConfiguration: any = yield call(get, ruleConfigPath(org, app));
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

export function* saveServiceConfigurationSaga({ payload }: PayloadAction<{org, app}>): SagaIterator {
  const { org, app } = payload;
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

    yield call(post, ruleConfigPath(org, app), {
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
