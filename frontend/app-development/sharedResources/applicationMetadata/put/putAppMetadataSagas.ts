import type { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { put as axiosPut } from 'app-shared/utils/networking';
import type { PayloadAction } from '@reduxjs/toolkit';
import { ApplicationMetadataActions } from '../applicationMetadataSlice';
import type { IPutApplicationMetadata } from '../applicationMetadataSlice';
import { appMetadataPath } from 'app-shared/api/paths';
import { _useParamsClassCompHack } from 'app-shared/utils/_useParamsClassCompHack';

export function* putApplicationMetadataSaga(
  action: PayloadAction<IPutApplicationMetadata>
): SagaIterator {
  const { applicationMetadata } = action.payload;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { org, app } = _useParamsClassCompHack();
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
