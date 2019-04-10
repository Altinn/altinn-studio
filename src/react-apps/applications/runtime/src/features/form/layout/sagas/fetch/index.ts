import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../../utils/networking';
import Actions from '../../actions';
import { IFetchFormLayout } from '../../actions/fetch';
import * as ActionTypes from '../../actions/types';

function* fetchFormLayoutSaga({ url }: IFetchFormLayout): SagaIterator {
  console.log('url: ', url);
  try {
    const formLayout = yield call(get, url);
    const { components, containers, order } = formLayout.data;
    console.log(formLayout);
    if (!formLayout || !formLayout.data) {
      yield call(
        Actions.fetchFormLayoutFulfilled,
        null, null, null,
      );
    } else {
      yield call(
        Actions.fetchFormLayoutFulfilled,
        components, containers, order,
      );
    }
  } catch (err) {
    yield call(Actions.fetchFormLayoutRejected, err);
  }

}

export function* watchFetchFormLayoutSaga(): SagaIterator {
  yield takeLatest(ActionTypes.FETCH_FORM_LAYOUT, fetchFormLayoutSaga);
}
