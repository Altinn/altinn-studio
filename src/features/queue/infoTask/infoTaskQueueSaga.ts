import { all, call, put, select, take } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { FormDataActions } from 'src/features/formData/formDataSlice';
import { InstanceDataActions } from 'src/features/instanceData/instanceDataSlice';
import { IsLoadingActions } from 'src/features/isLoading/isLoadingSlice';
import { QueueActions } from 'src/features/queue/queueSlice';
import { mapAsResources } from 'src/features/textResources/resourcesAsMap';
import { TextResourcesActions } from 'src/features/textResources/textResourcesSlice';
import { convertModelToDataBinding } from 'src/utils/databindings';
import { httpGet } from 'src/utils/network/sharedNetworking';
import { getFetchFormDataUrl } from 'src/utils/urls/appUrlHelper';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { TextResourceMap } from 'src/features/textResources';
import type { IRuntimeState } from 'src/types';
import type { IInstance } from 'src/types/shared';

export const ApplicationMetadataSelector = (state: IRuntimeState) => state.applicationMetadata.applicationMetadata;
export const TextResourceSelector = (state: IRuntimeState) => state.textResources.resourceMap;
export const InstanceDataSelector = (state: IRuntimeState) => state.instanceData.instance;

export function* startInitialInfoTaskQueueSaga(): SagaIterator {
  const appMetadata: IApplicationMetadata = yield select(ApplicationMetadataSelector);
  const textResourceMap: TextResourceMap = yield select(TextResourceSelector);
  const instance: IInstance = yield select(InstanceDataSelector);

  yield put(IsLoadingActions.startDataTaskIsLoading());

  const textResourcesWithVariables = mapAsResources(textResourceMap).filter(
    (resource) => resource.variables && resource.variables.length > 0,
  );

  if (textResourcesWithVariables && textResourcesWithVariables.length > 0) {
    const dataElements: string[] = [];
    textResourcesWithVariables.forEach((resource) => {
      resource.variables?.forEach((variable) => {
        const modelName = variable.dataSource.replace('dataModel.', '');
        const dataType = appMetadata.dataTypes.find((d) => d.id === modelName);
        if (!dataType) {
          return;
        }

        const dataElement = instance.data.find((e) => e.dataType === dataType.id);
        if (!dataElement) {
          return;
        }
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
  }

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
