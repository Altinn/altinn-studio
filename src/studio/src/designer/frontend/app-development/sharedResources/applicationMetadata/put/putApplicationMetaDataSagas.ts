import { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { put as axiosPut } from 'app-shared/utils/networking';
import { getApplicationMetadataUrl } from 'app-shared/utils/urlHelper';
import { PayloadAction } from '@reduxjs/toolkit';
import { ApplicationMetadataActions, IPutApplicationMetadata } from '../applicationMetadataSlice';

export function* putApplicationMetadataSaga(action: PayloadAction<IPutApplicationMetadata>): SagaIterator {
  const { applicationMetadata } = action.payload;
  try {
    const url = getApplicationMetadataUrl();
    const result = yield call(axiosPut, url, applicationMetadata);
    yield put(ApplicationMetadataActions.putApplicationMetadataFulfilled({ applicationMetadata: result }));
  } catch (error) {
    yield put(ApplicationMetadataActions.putApplicationMetadataRejected({ error }));
  }
}

export function* watchPutApplicationMetadataSaga(): SagaIterator {
  yield takeLatest(ApplicationMetadataActions.putApplicationMetadata, putApplicationMetadataSaga);
}
