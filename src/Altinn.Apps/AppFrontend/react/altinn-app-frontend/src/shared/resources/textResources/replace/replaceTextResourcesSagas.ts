import { SagaIterator } from 'redux-saga';
import { all, take, takeLatest, select, call } from 'redux-saga/effects';
import { IFormData } from 'src/features/form/data/formDataReducer';
import { IRepeatingGroups, IRuntimeState } from 'src/types';
import { replaceTextResourceParams } from 'altinn-shared/utils/language';
import { ITextResource, IApplicationSettings, IDataSources, IInstance, IInstanceContext } from 'altinn-shared/types';
import FormDataActions from '../../../../features/form/data/formDataActions';
import { FormLayoutActions } from '../../../../features/form/layout/formLayoutSlice';
import { FETCH_TEXT_RESOURCES_FULFILLED } from '../fetch/fetchTextResourcesActionTypes';
import TextResourceActions from '../textResourcesActions';
import { ITextResourcesState } from '../textResourcesReducer';
import { REPLACE_TEXT_RESOURCES } from './replaceTextResourcesActionTypes';
import { buildInstanceContext } from 'altinn-shared/utils/instanceContext';

export const InstanceSelector: (state: IRuntimeState) => IInstance = 
  (state) => state.instanceData?.instance;
export const FormDataSelector: (state: IRuntimeState) => IFormData = 
  (state) => state.formData?.formData;
export const ApplicationSettingsSelector: (state: IRuntimeState) => IApplicationSettings = 
  (state) => state.applicationSettings?.applicationSettings;
export const TextResourcesSelector: (state: IRuntimeState) => ITextResourcesState = 
  (state) => state.textResources;
export const RepeatingGroupsSelector: (state: IRuntimeState) => IRepeatingGroups =
  (state) => state.formLayout.uiConfig.repeatingGroups;

export function* replaceTextResourcesSaga(): SagaIterator {
  try {
    const formData: IFormData = yield select(FormDataSelector);
    const instance: IInstance = yield select(InstanceSelector);
    const applicationSettings: IApplicationSettings = yield select(ApplicationSettingsSelector);
    const textResources: ITextResourcesState = yield select(TextResourcesSelector);
    const repeatingGroups: IRepeatingGroups = yield select(RepeatingGroupsSelector);

    const instanceContext: IInstanceContext = buildInstanceContext(instance);
    
    const dataSources: IDataSources = { 
      dataModel: formData, 
      applicationSettings:  applicationSettings, 
      instanceContext: instanceContext
    };

    const updatedTextsResources: ITextResource[] =
      replaceTextResourceParams(textResources.resources, dataSources, repeatingGroups);
    if (JSON.stringify(textResources) !== JSON.stringify(updatedTextsResources)) {
      yield call(TextResourceActions.replaceTextResourcesFulfilled, textResources.language, updatedTextsResources);
    }
  } catch (error) {
    yield call(TextResourceActions.replaceTextResourcesRejected, error);
  }
}

export function* watchReplaceTextResourcesSaga(): SagaIterator {
  yield all([
    take(FETCH_TEXT_RESOURCES_FULFILLED),
    take(FormDataActions.fetchFormDataFulfilled),
    take(FormLayoutActions.updateRepeatingGroupsFulfilled),
  ]);
  yield call(replaceTextResourcesSaga);
  yield takeLatest(FormDataActions.fetchFormDataFulfilled, replaceTextResourcesSaga);
  yield takeLatest(FormDataActions.updateFormDataFulfilled, replaceTextResourcesSaga);
  yield takeLatest(FormDataActions.updateFormDataSkipAutosave, replaceTextResourcesSaga);
  yield takeLatest(FormDataActions.setFormDataFulfilled, replaceTextResourcesSaga);
}

export function* watchReplaceTextResourcesSagaDirect(): SagaIterator {
  yield takeLatest(REPLACE_TEXT_RESOURCES, replaceTextResourcesSaga);
}
