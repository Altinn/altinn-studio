import { all, call, put, select, take } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';
import { IsLoadingActions } from 'src/shared/resources/isLoading/isLoadingSlice';
import { QueueActions } from 'src/shared/resources/queue/queueSlice';
import { TextResourcesActions } from 'src/shared/resources/textResources/textResourcesSlice';
import { convertModelToDataBinding } from 'src/utils/databindings';
import { httpGet } from 'src/utils/network/sharedNetworking';
import { getFetchFormDataUrl } from 'src/utils/urls/appUrlHelper';
import type { IApplicationMetadata } from 'src/shared/resources/applicationMetadata';
import type { IRuntimeState, ITextResource } from 'src/types';
import type { IInstance } from 'src/types/shared';

export const ApplicationMetadataSelector = (state: IRuntimeState) => state.applicationMetadata.applicationMetadata;
export const TextResourceSelector = (state: IRuntimeState) => state.textResources.resources;
export const InstanceDataSelector = (state: IRuntimeState) => state.instanceData.instance;

export function* startInitialInfoTaskQueueSaga(): SagaIterator {
  const appMetadata: IApplicationMetadata = yield select(ApplicationMetadataSelector);
  const textResources: ITextResource[] = yield select(TextResourceSelector);
  const instance: IInstance = yield select(InstanceDataSelector);

  yield put(IsLoadingActions.startDataTaskIsLoading());

  const textResourcesWithVariables = textResources.filter((resource) => {
    return resource.variables && resource.variables.length > 0;
  });
  if (textResourcesWithVariables && textResourcesWithVariables.length > 0) {
    const dataElements: string[] = [];
    textResourcesWithVariables.forEach((resource) => {
      resource.variables?.forEach((variable) => {
        const modelName = variable.dataSource.replace('dataModel.', '');
        const dataType = appMetadata.dataTypes.find((d) => d.id === modelName);
        if (!dataType) return;

        const dataElement = instance.data.find((e) => e.dataType === dataType.id);
        if (!dataElement) return;
        dataElements.push(dataElement.id);
      });
    });

    let formData = {};
    for (const dataElementId of dataElements) {
      const fetchedData = yield call(httpGet, getFetchFormDataUrl(instance.id, dataElementId));
      formData = {
        ...formData,
        ...convertModelToDataBinding(fetchedData),
      };
    }

    yield put(FormDataActions.fetchFulfilled({ formData }));
    yield put(TextResourcesActions.replace());
  }

  yield put(QueueActions.startInitialInfoTaskQueueFulfilled());
  yield put(IsLoadingActions.finishDataTaskIsLoading());
}

export function* watchStartInitialInfoTaskQueueSaga(): SagaIterator {
  yield all([
    take(QueueActions.startInitialInfoTaskQueue),
    take(TextResourcesActions.fetchFulfilled),
    take(InstanceDataActions.getFulfilled),
  ]);
  yield call(startInitialInfoTaskQueueSaga);
}
