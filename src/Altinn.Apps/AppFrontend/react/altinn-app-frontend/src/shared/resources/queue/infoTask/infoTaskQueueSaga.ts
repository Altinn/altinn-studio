import { SagaIterator } from 'redux-saga';
import { all, call, put, select, take } from 'redux-saga/effects';
import { IRuntimeState, ITextResource } from 'src/types';
import { get } from 'altinn-shared/utils';
import { IInstance } from 'altinn-shared/types';
import FormDataActions from 'src/features/form/data/formDataActions';
import { startInitialInfoTaskQueue, startInitialInfoTaskQueueFulfilled } from '../queueSlice';
import TextResourceActions from '../../textResources/textResourcesActions';
import { IApplicationMetadata } from '../../applicationMetadata';
import { getFetchFormDataUrl } from '../../../../utils/appUrlHelper';
import { convertModelToDataBinding } from '../../../../utils/databindings';
import { finishDataTaskIsLoading, startDataTaskIsLoading } from '../../isLoading/isLoadingSlice';

export const ApplicationMetadataSelector = (state: IRuntimeState) => state.applicationMetadata.applicationMetadata;
export const TextResourceSelector = (state: IRuntimeState) => state.textResources.resources;
export const InstanceDataSelector = (state: IRuntimeState) => state.instanceData.instance;

export function* startInitialInfoTaskQueueSaga(): SagaIterator {
  const appMetadata: IApplicationMetadata = yield select(ApplicationMetadataSelector);
  const textResources: ITextResource[] = yield select(TextResourceSelector);
  const instance: IInstance = yield select(InstanceDataSelector);

  yield put(startDataTaskIsLoading());

  const textResourcesWithVariables = textResources.filter((resource) => {
    return resource.variables && resource.variables.length > 0;
  });
  if (textResourcesWithVariables && textResourcesWithVariables.length > 0) {
    const dataElements: string[] = [];
    textResourcesWithVariables.forEach((resource) => {
      resource.variables.forEach((variable) => {
        const modelName = variable.dataSource.replace('dataModel.', '');
        const dataType = appMetadata.dataTypes.find((d) => d.id === modelName);
        if (!dataType) return;

        const dataElement = instance.data.find((e) => e.dataType === dataType.id);
        if (!dataElement) return;
        dataElements.push(dataElement.id);
      });
    });

    let formData = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const dataElementId of dataElements) {
      const fetchedData = yield call(get, getFetchFormDataUrl(instance.id, dataElementId));
      formData = {
        ...formData,
        ...convertModelToDataBinding(fetchedData),
      };
    }

    yield put(FormDataActions.fetchFormDataFulfilled({ formData }));
    yield call(TextResourceActions.replaceTextResources);
  }

  yield put(startInitialInfoTaskQueueFulfilled());
  yield put(finishDataTaskIsLoading());
}

export function* watchStartInitialInfoTaskQueueSaga(): SagaIterator {
  yield all([
    take(startInitialInfoTaskQueue),
    take(TextResourceActions.fetchTextResourcesFulfilled),
  ]);
  yield call(startInitialInfoTaskQueueSaga);
}
