import { SagaIterator } from 'redux-saga';
import { all, call, take } from 'redux-saga/effects';
import { MAP_ATTACHMENTS_FULFILLED } from '../../attachments/attachmentActionTypes';
import { GET_INSTANCEDATA_FULFILLED } from '../../instanceData/get/getInstanceDataActionTypes';
import { FETCH_FORM_DATA_FULFILLED } from '../../../features/form/data/formDataActionTypes';
import { FETCH_DATA_MODEL_FULFILLED } from '../../../features/form/datamodel/fetch/fetchFormDatamodelActionTypes';
// import { FETCH_LANGUAGE_FULFILLED } from './../../language/fetch/fetchLanguageActionTypes';
import IsLoadingActions from '../isLoadingActions';

export function* watcherFinishDataTaskIsloadingSaga(): SagaIterator {
  yield all([
    take(FETCH_DATA_MODEL_FULFILLED),
    take(FETCH_FORM_DATA_FULFILLED),
    take(GET_INSTANCEDATA_FULFILLED),
    take(MAP_ATTACHMENTS_FULFILLED),
  ]);

  yield call(IsLoadingActions.finishDataTaskIsloading);
}
