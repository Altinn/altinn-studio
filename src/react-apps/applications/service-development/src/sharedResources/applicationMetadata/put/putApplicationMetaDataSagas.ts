import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { put } from '../../../../../shared/src/utils/networking';
import { getApplicationMetadataUrl } from '../../../../../shared/src/utils/urlHelper';
import * as MetadataActionTypes from '../applicationMetadataActionTypes';
import metadataActionDispatcher from '../applicationMetadataDispatcher';
import { IPutApplicationMetadata } from './putApplicationMetaDataActions';

export function* putApplicationMetadataSaga({ applicationMetadata }: IPutApplicationMetadata): SagaIterator {
  try {
    const url = getApplicationMetadataUrl();
    const result = yield call(put, url, applicationMetadata);
    yield call(metadataActionDispatcher.putApplicationMetadataFulfilled, result);
  } catch (error) {
    yield call(metadataActionDispatcher.putApplicationMetadataRejected, error);
  }
}

export function* watchPutApplicationMetadataSaga(): SagaIterator {
  yield takeLatest(
    MetadataActionTypes.PUT_APPLICATION_METADATA,
    putApplicationMetadataSaga,
  );
}
