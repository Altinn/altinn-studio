import type { SagaIterator } from 'redux-saga';
import { all, call, put, select, take } from 'redux-saga/effects';
import type { IRuntimeState, ITextResource } from 'src/types';
import { get } from 'altinn-shared/utils';
import type { IInstance } from 'altinn-shared/types';
import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { QueueActions } from '../queueSlice';
import { TextResourcesActions } from '../../textResources/textResourcesSlice';
import type { IApplicationMetadata } from '../../applicationMetadata';
import { getFetchFormDataUrl } from '../../../../utils/appUrlHelper';
import { convertModelToDataBinding } from '../../../../utils/databindings';
import { IsLoadingActions } from '../../isLoading/isLoadingSlice';

export const ApplicationMetadataSelector = (state: IRuntimeState) =>
  state.applicationMetadata.applicationMetadata;
export const TextResourceSelector = (state: IRuntimeState) =>
  state.textResources.resources;
export const InstanceDataSelector = (state: IRuntimeState) =>
  state.instanceData.instance;

export function* startInitialInfoTaskQueueSaga(): SagaIterator {
  const appMetadata: IApplicationMetadata = yield select(
    ApplicationMetadataSelector,
  );
  const textResources: ITextResource[] = yield select(TextResourceSelector);
  const instance: IInstance = yield select(InstanceDataSelector);

  yield put(IsLoadingActions.startDataTaskIsLoading());

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

        const dataElement = instance.data.find(
          (e) => e.dataType === dataType.id,
        );
        if (!dataElement) return;
        dataElements.push(dataElement.id);
      });
    });

    let formData = {};
    for (const dataElementId of dataElements) {
      const fetchedData = yield call(
        get,
        getFetchFormDataUrl(instance.id, dataElementId),
      );
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
  ]);
  yield call(startInitialInfoTaskQueueSaga);
}
