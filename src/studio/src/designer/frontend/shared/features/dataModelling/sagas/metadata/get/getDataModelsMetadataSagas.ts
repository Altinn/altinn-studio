import { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { get } from 'app-shared/utils/networking';
import { sharedUrls } from 'app-shared/utils/urlHelper';
import { DataModelsMetadataActions } from '../dataModelsMetadataSlice';

function* getDataModelsMetadataSaga(): SagaIterator {
  try {
    yield call(get, sharedUrls().ensureCloneApi);
    const dataModelsMetadata = yield call(get, sharedUrls().dataModelsApi);
    yield put(
      DataModelsMetadataActions.getDataModelsMetadataFulfilled({
        dataModelsMetadata,
      }),
    );
  } catch (error) {
    yield put(DataModelsMetadataActions.getDataModelsMetadataRejected({ error }));
  }
}

export function* watchGetDataModelsMetadataSaga(): SagaIterator {
  yield takeLatest(DataModelsMetadataActions.getDataModelsMetadata, getDataModelsMetadataSaga);
}
