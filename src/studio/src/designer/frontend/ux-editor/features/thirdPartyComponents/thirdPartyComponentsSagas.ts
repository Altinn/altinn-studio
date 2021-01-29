import { PayloadAction } from '@reduxjs/toolkit';
import * as React from 'react';
import { SagaIterator } from 'redux-saga';
import { call, fork, put, takeLatest } from 'redux-saga/effects';
import { fetchThirdPartyComponents,
  fetchThirdPartyComponentsFulfilled,
  fetchThirdPartyComponentsRejected,
  IFetchThirdPartyComponent } from './thirdPartyComponentSlice';
import { get } from '../../utils/networking';

function* fetchThirdPartyComponentsSaga({ payload }: PayloadAction<IFetchThirdPartyComponent>): SagaIterator {
  try {
    const { location } = payload;
    const fetchedDefinitions: any = yield call(get, location);
    if (!fetchedDefinitions || !fetchedDefinitions.packages) {
      yield put(fetchThirdPartyComponentsFulfilled({ components: null }));
      return;
    }
    let fetchedPackages: any = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const externalPackage of fetchedDefinitions.packages) {
      const fetchedSrc: any = yield call(get, externalPackage.location);
      const evaluatedSrc: any = eval(fetchedSrc);
      let fetchedComponents = {};
      Object.keys(evaluatedSrc.Components).forEach((component) => {
        fetchedComponents = {
          ...fetchedComponents,
          [component]: React.createElement(evaluatedSrc.Components[component]),
        };
      });

      fetchedPackages = Object.assign(fetchedPackages, {
        [externalPackage.packageName]: fetchedComponents,
      });
    }

    yield put(fetchThirdPartyComponentsFulfilled({ components: fetchedPackages }));
  } catch (error) {
    yield put(fetchThirdPartyComponentsRejected({ error }));
  }
}

export function* watchFetchThirdPartComponentsSaga(): SagaIterator {
  yield takeLatest(fetchThirdPartyComponents, fetchThirdPartyComponentsSaga);
}

export default function* thirdPartyComponentSagas(): SagaIterator {
  yield fork(watchFetchThirdPartComponentsSaga);
}
