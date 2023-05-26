import { put, select } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { TextResourcesActions } from 'src/features/textResources/textResourcesSlice';
import { replaceTextResourceParams } from 'src/language/sharedLanguage';
import { buildInstanceContext } from 'src/utils/instanceContext';
import type { IFormData } from 'src/features/formData';
import type { ITextResourcesState } from 'src/features/textResources';
import type { IRepeatingGroups, IRuntimeState } from 'src/types';
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
      applicationSettings,
      instanceContext,
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
