import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import * as AppDataActions from '../../actions/appDataActions/actions';
import AppDataActionDispatchers from '../../actions/appDataActions/appDataActionDispatcher';
import * as AppDataActionTypes from '../../actions/appDataActions/appDataActionTypes';
import { get } from '../../utils/networking';

/**
 * This is SAGA that handles retrieval of a specific codelist that is needed
 * in the form
 * @param codeListName the name of the needed codeList
 * @param url the URL for the API
 */
function* fetchCodeListsSaga({
  url,
}: AppDataActions.IFetchCodeListsAction): SagaIterator {
  try {
    const codeLists = yield call(get, url);

    /**
     *  List of codeList is retrived. Call dispatcher with result so it can be handled by the relevant
     *  Reducer listening to this even.
     */
    yield call(
      AppDataActionDispatchers.fetchCodeListsFulfilled,
      codeLists,
    );
  } catch (err) {
    // An Error happened. Dispatch Event Dispatchers with error information
    yield call(AppDataActionDispatchers.fetchCodeListsRejected, err);
  }
}

/**
 * Register event handler for Fetch Code List
 */
export function* watchFetchCodeListsSaga(): SagaIterator {
  yield takeLatest(AppDataActionTypes.FETCH_CODE_LISTS, fetchCodeListsSaga);
}
