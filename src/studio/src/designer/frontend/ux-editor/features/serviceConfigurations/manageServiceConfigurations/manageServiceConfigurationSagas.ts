import { SagaIterator } from 'redux-saga';
import { call, put, select, takeLatest } from 'redux-saga/effects';
import postMessages from 'app-shared/utils/postMessages';
import { fetchServiceConfiguration,
  fetchServiceConfigurationFulfilled,
  fetchServiceConfigurationRejected,
  saveServiceConfiguration,
  saveServiceConfigurationFulfilled,
  saveServiceConfigurationRejected } from './manageServiceConfigurationsSlice';
import { addConditionalRenderingConnection, setConditionalRenderingConnections } from '../conditionalRendering/conditionalRenderingSlice';
import { IServiceConfigurationState } from '../../../reducers/serviceConfigurationReducer';
import { get, post } from '../../../utils/networking';
import { getFetchRuleConfigurationUrl, getSaveServiceConfigurationUrl } from '../../../utils/urlHelper';

const selectServiceConfiguration = (state: IAppState): IServiceConfigurationState => state.serviceConfigurations;

export function* watchFetchServiceConfigurationSaga(): SagaIterator {
  yield takeLatest(fetchServiceConfiguration, fetchJsonFileSaga);
}

export function* fetchJsonFileSaga(): SagaIterator {
  try {
    const serviceConfiguration: any = yield call(get, getFetchRuleConfigurationUrl());
    yield put(fetchServiceConfigurationFulfilled());
    yield put(setConditionalRenderingConnections({
      conditionalRendering: serviceConfiguration?.data?.conditionalRendering,
    }));
    // yield put(setRuleConnection({
    //   ruleConnection: serviceConfiguration?.data?.ruleConection,
    // }));
  } catch (error) {
    yield put(fetchServiceConfigurationRejected({ error }));
  }
}

export function* watchSaveJsonFileSaga(): SagaIterator {
  yield takeLatest(saveServiceConfiguration, saveJsonFileSaga);
  yield takeLatest(addConditionalRenderingConnection, saveJsonFileSaga);
}

export function* saveJsonFileSaga(): SagaIterator {
  try {
    const serviceConfigurationState: IServiceConfigurationState = yield select(selectServiceConfiguration);

    // create new serviceConfigurations object without manageServiceConfiguration status
    const newServiceConfigurationsObj = Object.keys(serviceConfigurationState)
      .filter((elem: any) => elem !== 'manageServiceConfiguration')
      .reduce((acc: any, elem: any) => {
        acc[elem] = serviceConfigurationState[elem];
        return acc;
      }, {});

    yield call(post, getSaveServiceConfigurationUrl(), {
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
