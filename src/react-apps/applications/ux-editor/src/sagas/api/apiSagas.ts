import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import * as ApiActions from '../../actions/apiActions/actions';
import ApiActionDispatchers from '../../actions/apiActions/apiActionDispatcher';
import * as ApiActionTypes from '../../actions/apiActions/apiActionTypes';
import ServiceConfigActionDispatchers from '../../actions/manageServiceConfigurationActions/manageServiceConfigurationActionDispatcher';

import { IApiState } from '../../reducers/apiReducer';
import { getSaveServiceConfigurationUrl } from '../../utils/urlHelper';

const selectApi = (state: IAppState): IApiState => state.serviceConfigurations.APIs;

function* addApiConnectionSaga({ newConnection }: ApiActions.IAddApiConnection): SagaIterator {
  try {
    yield call(ApiActionDispatchers.addApiConnectionFulfilled, newConnection);
    const saveServiceConfigurationUrl: string = yield call(getSaveServiceConfigurationUrl);
    yield call(
      ServiceConfigActionDispatchers.saveJsonFile,
      saveServiceConfigurationUrl,
    );
  } catch (err) {
    yield call(ApiActionDispatchers.addApiConnectionRejected, err);
  }
}

export function* watchAddApiConnectionSaga(): SagaIterator {
  yield takeLatest(
    ApiActionTypes.ADD_API_CONNECTION,
    addApiConnectionSaga,
  );
}

function* delApiConnectionSaga({ connectionId }: ApiActions.IDelApiConnection): SagaIterator {
  try {
    // get state
    const apiState: IApiState = yield select(selectApi);

    // create array
    const connectionsArray = Object.keys(apiState.connections);

    // filter out the "connectionID" to delete
    const newConnectionsArray = connectionsArray.filter((connection: any) => connection !== connectionId);

    // create new object with newConnectionsArray content
    const newConnectionsObj = newConnectionsArray.reduce((acc: any, connection: any) => {
      acc[connection] = apiState.connections[connection];
      return acc;
    }, {});

    yield call(ApiActionDispatchers.delApiConnectionFulfilled, newConnectionsObj);
    const saveServiceConfigurationUrl: string = yield call(getSaveServiceConfigurationUrl);
    yield call(
      ServiceConfigActionDispatchers.saveJsonFile,
      saveServiceConfigurationUrl,
    );
  } catch (err) {
    yield call(ApiActionDispatchers.delApiConnectionRejected, err);
  }
}

export function* watchDelApiConnectionSaga(): SagaIterator {
  yield takeLatest(
    ApiActionTypes.DELETE_API_CONNECTION,
    delApiConnectionSaga,
  );
}
