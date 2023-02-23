import { put } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { FooterLayoutActions } from 'src/features/footer/data/footerLayoutSlice';
import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { DataModelActions } from 'src/features/form/datamodel/datamodelSlice';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { PdfActions } from 'src/features/pdf/data/pdfSlice';
import { ApplicationMetadataActions } from 'src/shared/resources/applicationMetadata/applicationMetadataSlice';
import { ApplicationSettingsActions } from 'src/shared/resources/applicationSettings/applicationSettingsSlice';
import { AttachmentActions } from 'src/shared/resources/attachments/attachmentSlice';
import { IsLoadingActions } from 'src/shared/resources/isLoading/isLoadingSlice';
import { LanguageActions } from 'src/shared/resources/language/languageSlice';
import { OrgsActions } from 'src/shared/resources/orgs/orgsSlice';
import { PartyActions } from 'src/shared/resources/party/partySlice';
import { ProfileActions } from 'src/shared/resources/profile/profileSlice';
import { watchStartInitialInfoTaskQueueSaga } from 'src/shared/resources/queue/infoTask/infoTaskQueueSaga';
import { TextResourcesActions } from 'src/shared/resources/textResources/textResourcesSlice';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import { profileApiUrl } from 'src/utils/urls/appUrlHelper';
import type { IQueueError, IQueueState } from 'src/shared/resources/queue';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';

const commonState = { isDone: null, error: null };
export const initialState: IQueueState = {
  dataTask: { ...commonState },
  appTask: { ...commonState },
  userTask: { ...commonState },
  infoTask: { ...commonState },
  stateless: { ...commonState },
};

export const queueSlice = createSagaSlice((mkAction: MkActionType<IQueueState>) => ({
  name: 'queue',
  initialState,
  actions: {
    appTaskQueueError: mkAction<IQueueError>({
      reducer: (state, action) => {
        const { error } = action.payload;
        state.appTask.error = error;
      },
    }),
    userTaskQueueError: mkAction<IQueueError>({
      reducer: (state, action) => {
        const { error } = action.payload;
        state.userTask.error = error;
      },
    }),
    dataTaskQueueError: mkAction<IQueueError>({
      reducer: (state, action) => {
        const { error } = action.payload;
        state.dataTask.error = error;
      },
    }),
    infoTaskQueueError: mkAction<IQueueError>({
      reducer: (state, action) => {
        const { error } = action.payload;
        state.infoTask.error = error;
      },
    }),
    statelessQueueError: mkAction<IQueueError>({
      reducer: (state, action) => {
        const { error } = action.payload;
        state.stateless.error = error;
      },
    }),
    startInitialAppTaskQueue: mkAction<void>({
      takeEvery: function* (): SagaIterator {
        yield put(ApplicationSettingsActions.fetchApplicationSettings());
        yield put(TextResourcesActions.fetch());
        yield put(LanguageActions.fetchLanguage());
        yield put(ApplicationMetadataActions.get());
        yield put(FormLayoutActions.fetchSets());
        yield put(FooterLayoutActions.fetch());
        yield put(OrgsActions.fetch());
        yield put(QueueActions.startInitialAppTaskQueueFulfilled());
      },
      reducer: (state) => {
        state.appTask.isDone = false;
      },
    }),
    startInitialAppTaskQueueFulfilled: mkAction<void>({
      reducer: (state) => {
        state.appTask.isDone = true;
      },
    }),
    startInitialUserTaskQueue: mkAction<void>({
      takeEvery: function* (): SagaIterator {
        yield put(ProfileActions.fetch({ url: profileApiUrl }));
        yield put(PartyActions.getCurrentParty());
        yield put(QueueActions.startInitialUserTaskQueueFulfilled());
      },
      reducer: (state) => {
        state.userTask.isDone = false;
      },
    }),
    startInitialUserTaskQueueFulfilled: mkAction<void>({
      reducer: (state) => {
        state.userTask.isDone = true;
      },
    }),
    startInitialDataTaskQueue: mkAction<void>({
      takeEvery: function* (): SagaIterator {
        yield put(FormDataActions.fetchInitial());
        yield put(DataModelActions.fetchJsonSchema());
        yield put(FormLayoutActions.fetch());
        yield put(FormLayoutActions.fetchSettings());
        yield put(PdfActions.initial());
        yield put(AttachmentActions.mapAttachments());
        yield put(QueueActions.startInitialDataTaskQueueFulfilled());
      },
      reducer: (state) => {
        state.dataTask.isDone = false;
      },
    }),
    startInitialDataTaskQueueFulfilled: mkAction<void>({
      reducer: (state) => {
        state.dataTask.isDone = true;
      },
    }),
    startInitialInfoTaskQueue: mkAction<void>({
      saga: () => watchStartInitialInfoTaskQueueSaga,
      reducer: (state) => {
        state.infoTask.isDone = false;
      },
    }),
    startInitialInfoTaskQueueFulfilled: mkAction<void>({
      reducer: (state) => {
        state.infoTask.isDone = true;
      },
    }),
    startInitialStatelessQueue: mkAction<void>({
      takeLatest: function* (): SagaIterator {
        yield put(IsLoadingActions.startStatelessIsLoading());
        yield put(FormDataActions.fetchInitial());
        yield put(DataModelActions.fetchJsonSchema());
        yield put(FormLayoutActions.fetch());
        yield put(FormLayoutActions.fetchSettings());
        yield put(QueueActions.startInitialStatelessQueueFulfilled());
      },
      reducer: (state) => {
        state.stateless.isDone = false;
      },
    }),
    startInitialStatelessQueueFulfilled: mkAction<void>({
      reducer: (state) => {
        state.stateless.isDone = true;
      },
    }),
  },
}));

export const QueueActions = queueSlice.actions;
