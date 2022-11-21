import { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../../utils/networking';
import { sharedUrls } from '../../../../../utils/urlHelper';
import { DataModelsMetadataActions, IDataModelMetadataItem } from '../dataModelsMetadataSlice';

function* getDataModelsMetadataSaga(): SagaIterator {
  try {
    // yield call(get, sharedUrls().ensureCloneApi);
    const dataModelsMetadata: IDataModelMetadataItem[] = yield call(get, sharedUrls().dataModelsApi);
    const dataModelsMetadataXsd: IDataModelMetadataItem[] = yield call(get, `${sharedUrls().dataModelsApi}/xsd`);
    const uniqueXsdOptions = dataModelsMetadataXsd.filter((option) => {
      const modelName = option.fileName.replace(
        option.fileType,
        '',
      );
      return !dataModelsMetadata.find(
        (o) => o.fileName === `${modelName}.schema.json`,
      );
    });
    yield put(
      DataModelsMetadataActions.getDataModelsMetadataFulfilled({
        dataModelsMetadata: dataModelsMetadata.concat(uniqueXsdOptions),
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
