import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import * as ThirdPartyActions from '../../actions/thirdPartyComponentsActions/actions';
import ThirdPartyComponentsActionDispatcher from '../../actions/thirdPartyComponentsActions/thirdPartyComponentsActionDispatcher';
import * as ThirdPartyActionTypes from '../../actions/thirdPartyComponentsActions/thirdPartyComponentsActionTypes';
import { get } from '../../utils/networking';
import * as React from 'react';

function* fetchThirdPartyComponentsSaga(action: ThirdPartyActions.IFetchThirdPartyComponent): SagaIterator {
  try {
    const fetchedSrc: any = yield call(get, action.location);
    const evaluatedSrc: any = eval(fetchedSrc);
    let fetchedComponents: any = null;
    for (let component in action.components) {
      if (!component) continue;
      fetchedComponents = Object.assign({
        [action.components[component]]: React.createElement(evaluatedSrc.Components[action.components[component]]),
      }, fetchedComponents);
    }
    if (!fetchedComponents) {
      yield call(
        ThirdPartyComponentsActionDispatcher.fetchThirdPartyComponentsFulfilled,
        null,
      );
    }
    yield call(
      ThirdPartyComponentsActionDispatcher.fetchThirdPartyComponentsFulfilled,
      fetchedComponents,
    );
  } catch (err) {
    yield call(
      ThirdPartyComponentsActionDispatcher.fetchThirdPartyComponentsRejected,
      err,
    );
  }
}

export function* watchFetchThirdPartComponentsSaga(): SagaIterator {
  yield takeLatest(ThirdPartyActionTypes.FETCH_THIRD_PARTY_COMPONENTS, fetchThirdPartyComponentsSaga);
}
