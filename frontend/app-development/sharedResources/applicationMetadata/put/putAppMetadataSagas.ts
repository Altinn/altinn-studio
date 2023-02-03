import type { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { put as axiosPut } from 'app-shared/utils/networking';
import type { PayloadAction } from '@reduxjs/toolkit';
import { ApplicationMetadataActions } from '../applicationMetadataSlice';
import type { IPutApplicationMetadata } from '../applicationMetadataSlice';
import { useParams } from 'react-router-dom';
import { appMetadataPath } from 'app-shared/api-paths';

export function* putApplicationMetadataSaga(
  action: PayloadAction<IPutApplicationMetadata>
): SagaIterator {
  const { applicationMetadata } = action.payload;
  try {
    const { org, app } = useParams();
    const result = yield call(axiosPut, appMetadataPath(org, app), applicationMetadata);
    yield put(
      ApplicationMetadataActions.putApplicationMetadataFulfilled({
        applicationMetadata: result,
      })
    );
  } catch (error) {
    yield put(ApplicationMetadataActions.putApplicationMetadataRejected({ error }));
  }
}

export function* watchPutApplicationMetadataSaga(): SagaIterator {
  yield takeLatest(ApplicationMetadataActions.putApplicationMetadata, putApplicationMetadataSaga);
}
