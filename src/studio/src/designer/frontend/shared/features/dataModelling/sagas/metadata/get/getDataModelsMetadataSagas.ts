import type { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../../utils/networking';
import type { IDataModelMetadataItem } from '../dataModelsMetadataSlice';
import { DataModelsMetadataActions } from '../dataModelsMetadataSlice';
import { datamodelsPath, datamodelsXsdPath } from '../../../../../api-paths';
import { _useParamsClassCompHack } from '../../../../../utils/_useParamsClassCompHack';

function* getDataModelsMetadataSaga(): SagaIterator {
  try {
    const { org, app } = _useParamsClassCompHack();
    const dataModelsMetadata: IDataModelMetadataItem[] = yield call(get, datamodelsPath(org, app));
    const dataModelsMetadataXsd: IDataModelMetadataItem[] = yield call(
      get,
      datamodelsXsdPath(org, app)
    );
    const uniqueXsdOptions = dataModelsMetadataXsd.filter((option) => {
      const modelName = option.fileName.replace(option.fileType, '');
      return !dataModelsMetadata.find((o) => o.fileName === `${modelName}.schema.json`);
    });
    yield put(
      DataModelsMetadataActions.getDataModelsMetadataFulfilled({
        dataModelsMetadata: dataModelsMetadata.concat(uniqueXsdOptions),
      })
    );
  } catch (error) {
    yield put(DataModelsMetadataActions.getDataModelsMetadataRejected({ error }));
  }
}

export function* watchGetDataModelsMetadataSaga(): SagaIterator {
  yield takeLatest(DataModelsMetadataActions.getDataModelsMetadata, getDataModelsMetadataSaga);
}
