import type { SagaIterator } from 'redux-saga';
import { all, take, takeLatest, select, call, put } from 'redux-saga/effects';
import type { IFormData } from 'src/features/form/data';
import type { IRepeatingGroups, IRuntimeState } from 'src/types';
import { replaceTextResourceParams } from 'altinn-shared/utils/language';
import type {
  ITextResource,
  IApplicationSettings,
  IDataSources,
  IInstance,
  IInstanceContext,
} from 'altinn-shared/types';
import { FormDataActions } from '../../../../features/form/data/formDataSlice';
import { FormLayoutActions } from '../../../../features/form/layout/formLayoutSlice';
import type { ITextResourcesState } from '../';
import { buildInstanceContext } from 'altinn-shared/utils/instanceContext';
import { TextResourcesActions } from 'src/shared/resources/textResources/textResourcesSlice';

export const InstanceSelector: (state: IRuntimeState) => IInstance = (state) =>
  state.instanceData?.instance;
export const FormDataSelector: (state: IRuntimeState) => IFormData = (state) =>
  state.formData?.formData;
export const ApplicationSettingsSelector: (
  state: IRuntimeState,
) => IApplicationSettings = (state) =>
  state.applicationSettings?.applicationSettings;
export const TextResourcesSelector: (
  state: IRuntimeState,
) => ITextResourcesState = (state) => state.textResources;
export const RepeatingGroupsSelector: (
  state: IRuntimeState,
) => IRepeatingGroups = (state) => state.formLayout.uiConfig.repeatingGroups;

export function* replaceTextResourcesSaga(): SagaIterator {
  try {
    const formData: IFormData = yield select(FormDataSelector);
    const instance: IInstance = yield select(InstanceSelector);
    const applicationSettings: IApplicationSettings = yield select(
      ApplicationSettingsSelector,
    );
    const textResources: ITextResourcesState = yield select(
      TextResourcesSelector,
    );
    const repeatingGroups: IRepeatingGroups = yield select(
      RepeatingGroupsSelector,
    );

    const instanceContext: IInstanceContext = buildInstanceContext(instance);

    const dataSources: IDataSources = {
      dataModel: formData,
      applicationSettings: applicationSettings,
      instanceContext: instanceContext,
    };

    const updatedTextsResources: ITextResource[] = replaceTextResourceParams(
      textResources.resources,
      dataSources,
      repeatingGroups,
    );
    if (
      JSON.stringify(textResources) !== JSON.stringify(updatedTextsResources)
    ) {
      yield put(
        TextResourcesActions.replaceFulfilled({
          language: textResources.language,
          resources: updatedTextsResources,
        }),
      );
    }
  } catch (error) {
    yield put(TextResourcesActions.replaceRejected({ error }));
  }
}

export function* watchReplaceTextResourcesSaga(): SagaIterator {
  yield all([
    take(TextResourcesActions.fetchFulfilled),
    take(FormDataActions.fetchFulfilled),
    take(FormLayoutActions.updateRepeatingGroupsFulfilled),
  ]);
  yield call(replaceTextResourcesSaga);
  yield takeLatest(FormDataActions.fetchFulfilled, replaceTextResourcesSaga);
  yield takeLatest(FormDataActions.updateFulfilled, replaceTextResourcesSaga);
  yield takeLatest(FormDataActions.setFulfilled, replaceTextResourcesSaga);
  yield takeLatest(
    TextResourcesActions.fetchFulfilled,
    replaceTextResourcesSaga,
  );
}

export function* watchReplaceTextResourcesSagaDirect(): SagaIterator {
  yield takeLatest(TextResourcesActions.replace, replaceTextResourcesSaga);
  yield takeLatest(
    FormLayoutActions.updateRepeatingGroupsFulfilled,
    replaceTextResourcesSaga,
  );
}
