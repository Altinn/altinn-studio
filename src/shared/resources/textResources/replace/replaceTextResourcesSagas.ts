import { all, call, put, select, take, takeLatest } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { TextResourcesActions } from 'src/shared/resources/textResources/textResourcesSlice';
import { buildInstanceContext } from 'src/utils/instanceContext';
import type { IFormData } from 'src/features/form/data';
import type { ITextResourcesState } from 'src/shared/resources/textResources';
import type { IRepeatingGroups, IRuntimeState } from 'src/types';

import { replaceTextResourceParams } from 'src/language/sharedLanguage';
import type { IApplicationSettings, IDataSources, IInstance, IInstanceContext, ITextResource } from 'src/types/shared';

export const InstanceSelector: (state: IRuntimeState) => IInstance | null = (state) => state.instanceData?.instance;
export const FormDataSelector: (state: IRuntimeState) => IFormData = (state) => state.formData?.formData;
export const ApplicationSettingsSelector: (state: IRuntimeState) => IApplicationSettings | null = (state) =>
  state.applicationSettings?.applicationSettings;
export const TextResourcesSelector: (state: IRuntimeState) => ITextResourcesState = (state) => state.textResources;
export const RepeatingGroupsSelector: (state: IRuntimeState) => IRepeatingGroups | null = (state) =>
  state.formLayout.uiConfig.repeatingGroups;

export function* replaceTextResourcesSaga(): SagaIterator {
  try {
    const formData: IFormData = yield select(FormDataSelector);
    const instance: IInstance = yield select(InstanceSelector);
    const applicationSettings: IApplicationSettings = yield select(ApplicationSettingsSelector);
    const textResources: ITextResourcesState = yield select(TextResourcesSelector);
    const repeatingGroups: IRepeatingGroups = yield select(RepeatingGroupsSelector);

    const instanceContext: IInstanceContext | null = buildInstanceContext(instance);

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
    if (JSON.stringify(textResources) !== JSON.stringify(updatedTextsResources)) {
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
  yield takeLatest(TextResourcesActions.fetchFulfilled, replaceTextResourcesSaga);
}
