import { call, put, select, take } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { ApplicationMetadataActions } from 'src/features/applicationMetadata/applicationMetadataSlice';
import { FooterLayoutActions } from 'src/features/footer/data/footerLayoutSlice';
import { httpGet } from 'src/utils/network/networking';
import { getFooterLayoutUrl } from 'src/utils/urls/appUrlHelper';
import type { IApplicationMetadata } from 'src/features/applicationMetadata/index.d';
import type { IFooterLayout } from 'src/features/footer/types';
import type { IRuntimeState } from 'src/types';

export function* fetchFooterLayoutSaga(): SagaIterator {
  yield take(ApplicationMetadataActions.getFulfilled);
  const applicationMetadata: IApplicationMetadata = yield select(
    (state: IRuntimeState) => state.applicationMetadata.applicationMetadata,
  );
  if (applicationMetadata.features?.footer) {
    try {
      const footerLayout: IFooterLayout = yield call(httpGet, getFooterLayoutUrl());
      yield put(FooterLayoutActions.fetchFulfilled({ footerLayout }));
    } catch (error) {
      if (error?.response?.status === 404) {
        // We accept that the app does not have a layout sets as this is not default
        yield put(FooterLayoutActions.fetchFulfilled({ footerLayout: null }));
      } else {
        yield put(FooterLayoutActions.fetchRejected({ error }));
      }
    }
  } else {
    yield put(FooterLayoutActions.fetchFulfilled({ footerLayout: null }));
  }
}
