import { SagaIterator } from 'redux-saga';
import { all, call, take } from 'redux-saga/effects';
import DataModelActions from 'src/features/form/datamodel/formDatamodelActions';
import { IAltinnWindow } from 'altinn-shared/types';
import QueueActions from '../queueActions';
import ApplicationMetadataActions from '../../applicationMetadata/actions';
import TextResourcesActions from '../../textResources/textResourcesActions';
import ProfileActions from '../../profile/profileActions';
import LanguageActions from '../../language/languageActions';
import PartyActions from '../../party/partyActions';
import { profileApiUrl } from '../../../../utils/urlHelper';

export function* startInitialAppTaskQueue(): SagaIterator {
  const { org, app } = window as Window as IAltinnWindow;
  yield call(ProfileActions.fetchProfile, profileApiUrl);
  yield call(TextResourcesActions.fetchTextResources);
  yield call(LanguageActions.fetchLanguage);
  yield call(ApplicationMetadataActions.getApplicationMetadata);
  yield call(PartyActions.getCurrentParty);
  // JSON schema and data model is stricly not needed now, but pre-fetching these here to save some time during instantiation
  yield call(DataModelActions.fetchJsonSchema);
  yield call(DataModelActions.fetchDataModel, `${window.location.origin}/${org}/${app}/api/metadata/ServiceMetaData`);
  yield call(QueueActions.startInitialAppTaskQueueFulfilled);
}

export function* watchStartInitialAppTaskQueueSaga(): SagaIterator {
  yield all([
    take(QueueActions.startInitialAppTaskQueue),
  ]);

  yield call(startInitialAppTaskQueue);
}
