import { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { get } from '../../../../../utils/networking';
import { sharedUrls } from '../../../../../utils/urlHelper';
import { DataModelsMetadataActions, IDataModelsMetadataAction } from '../dataModelsMetadataSlice';

function* getDataModelsMetadataSaga({ payload }: PayloadAction<IDataModelsMetadataAction>): SagaIterator {
  try {
    const result = yield call(get, sharedUrls().dataModelsApi);
    const fileNameMatch = payload?.schemaName && `${payload.schemaName}.`;
    const dataModelsMetadata = fileNameMatch ? result.map((data: any) => {
      return !data.fileName.startsWith(fileNameMatch) ? data : {
        ...data,
        select: true,
      };
    }) : result;
    yield put(DataModelsMetadataActions.getDataModelsMetadataFulfilled({ dataModelsMetadata }));
  } catch (error) {
    yield put(DataModelsMetadataActions.getDataModelsMetadataRejected({ error }));
  }
}

export function* watchGetDataModelsMetadataSaga(): SagaIterator {
  yield takeLatest(DataModelsMetadataActions.getDataModelsMetadata, getDataModelsMetadataSaga);
}
