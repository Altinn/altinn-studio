import * as React from 'react';
import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import * as ThirdPartyActions from '../../actions/thirdPartyComponentsActions/actions';
import ThirdPartyComponentsActionDispatcher from '../../actions/thirdPartyComponentsActions/thirdPartyComponentsActionDispatcher';
import * as ThirdPartyActionTypes from '../../actions/thirdPartyComponentsActions/thirdPartyComponentsActionTypes';
import { get } from '../../utils/networking';

function* fetchThirdPartyComponentsSaga(action: ThirdPartyActions.IFetchThirdPartyComponent): SagaIterator {
  try {
    const fetchedDefinitions: any = yield call(get, action.location);
    if (!fetchedDefinitions || !fetchedDefinitions.packages) {
      yield call(
        ThirdPartyComponentsActionDispatcher.fetchThirdPartyComponentsFulfilled,
        null,
      );
      return;
    }
    let fetchedPackages: any = {};
    for (const externalPackage of fetchedDefinitions.packages) {
      const fetchedSrc: any = yield call(get, externalPackage.location);
      const evaluatedSrc: any = eval(fetchedSrc);
      let fetchedComponents = {};
      for (const component in evaluatedSrc.Components) {
        fetchedComponents = Object.assign(fetchedComponents, {
          [component]: React.createElement(evaluatedSrc.Components[component]),
        });
      }
      fetchedPackages = Object.assign(fetchedPackages, {
        [externalPackage.packageName]: fetchedComponents,
      });
    }
    yield call(
      ThirdPartyComponentsActionDispatcher.fetchThirdPartyComponentsFulfilled,
      fetchedPackages,
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
