import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';

import DataModelActions from '../../actions';
import { IFetchDataModel } from '../../actions/fetch';
import * as ActionTypes from '../../actions/types';

import ConfigActions from '../../../config/actions';
import QueueActions from '../../../../../shared/resources/queue/queueActions';

import { get } from '../../../../../utils/networking';

function* fetchFormDataModelSaga({ url }: IFetchDataModel): SagaIterator {
  try {
    const dataModel: any = yield call(get, url);

    const {
      Org,
      ServiceName,
      RepositoryName,
      ServiceId,
    } = dataModel;
    const dataModelFields: any[] = [];
    for (const dataModelField in dataModel.elements) {
      if (!dataModelField) {
        continue;
      }
      dataModelFields.push(dataModel.elements[dataModelField]);
    }
    yield call(DataModelActions.fetchDataModelFulfilled, dataModelFields);
    yield call(ConfigActions.fetchFormConfigFulfilled, Org, ServiceName, RepositoryName, ServiceId);
  } catch (err) {
    yield call(DataModelActions.fetchDataModelRejected, err);
    yield call(QueueActions.dataTaskQueueError, err)
  }
}

export function* watchFetchFormDataModelSaga(): SagaIterator {
  yield takeLatest(ActionTypes.FETCH_DATA_MODEL, fetchFormDataModelSaga);
}
