import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../../../../shared/src/utils/networking';
import FormUserActions from '../../actions';
import { IFetchFormUser } from '../../actions/fetch';
import * as FormUserActionTypes from '../../actions/types';

function* fetchFormUserSaga({ url }: IFetchFormUser): SagaIterator {
  try {
    const formUser = yield call(get, url);
    const { organization, person } = formUser.party;
    yield call(
      FormUserActions.fetchFormUserFulfilled, person.firstName, person.middleName, person.lastName, organization,
    );
  } catch (err) {
    yield call(FormUserActions.fetchFormUserRejected, err);
  }
}

export function* watchFetchFormUserSaga(): SagaIterator {
  yield takeLatest(FormUserActionTypes.FETCH_FORM_USER, fetchFormUserSaga);
}
