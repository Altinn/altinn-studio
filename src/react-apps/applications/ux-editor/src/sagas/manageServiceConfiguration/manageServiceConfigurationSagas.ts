import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import * as ManageJsonFileActions from '../../actions/manageServiceConfigurationActions/actions/index';
import ManageJsonFileActionDispatcher from '../../actions/manageServiceConfigurationActions/manageServiceConfigurationActionDispatcher';
import * as ManageJsonFileActionTypes from '../../actions/manageServiceConfigurationActions/manageServiceConfigurationActionTypes';
import { IServiceConfigurationState } from '../../reducers/serviceConfigurationReducer';
import { get, post } from '../../utils/networking';

const selectServiceConfiguration = (state: IAppState): IServiceConfigurationState => state.serviceConfigurations;

export function* watchFetchJsonFileSaga(): SagaIterator {
  yield takeLatest(ManageJsonFileActionTypes.FETCH_JSON_FILE, fetchJsonFileSaga);
}

export function* fetchJsonFileSaga({ url }: ManageJsonFileActions.IFetchJsonFileAction): SagaIterator {
  try {
    const serviceConfiguration = yield call(get, url);
    yield call(
      ManageJsonFileActionDispatcher.fetchJsonFileFulfilled,
      serviceConfiguration.data,
    );
  } catch (err) {
    yield call(ManageJsonFileActionDispatcher.fetchJsonFileRejected, err);
  }
}

export function* watchSaveJsonFileSaga(): SagaIterator {
  yield takeLatest(ManageJsonFileActionTypes.SAVE_JSON_FILE, saveJsonFileSaga);
}

export function* saveJsonFileSaga({ url }: ManageJsonFileActions.ISaveJsonFileAction): SagaIterator {
  try {
    const serviceConfigurationState: IServiceConfigurationState = yield select(selectServiceConfiguration);

    // create new serviceConfigurations object without manageServiceConfiguration status
    const newServiceConfigurationsObj = Object.keys(serviceConfigurationState)
      .filter((elem: any) => elem !== 'manageServiceConfiguration')
      .reduce((acc: any, elem: any, service) => {
        acc[elem] = serviceConfigurationState[elem];
        return acc;
      }, {});

    yield call(post, url, {
      data: {
        ...newServiceConfigurationsObj,
      },
    });

    yield call(
      ManageJsonFileActionDispatcher.saveJsonFileFulfilled,
      'data',
    );
  } catch (err) {
    yield call(ManageJsonFileActionDispatcher.saveJsonFileRejected, err);
  }
}
