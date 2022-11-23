import { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../../utils/networking';
import { DataModelsMetadataActions } from '../dataModelsMetadataSlice';
import { datamodelsPath } from '../../../../../api-paths';
import { _useParamsClassCompHack } from '../../../../../utils/_useParamsClassCompHack';

function* getDataModelsMetadataSaga(): SagaIterator {
  try {
    const { org, app } = _useParamsClassCompHack();
    const dataModelsMetadata = yield call(get, datamodelsPath(org, app));
    yield put(
      DataModelsMetadataActions.getDataModelsMetadataFulfilled({
        dataModelsMetadata,
      }),
    );
  } catch (error) {
    yield put(
      DataModelsMetadataActions.getDataModelsMetadataRejected({ error }),
    );
  }
}

export function* watchGetDataModelsMetadataSaga(): SagaIterator {
  yield takeLatest(
    DataModelsMetadataActions.getDataModelsMetadata,
    getDataModelsMetadataSaga,
  );
}
