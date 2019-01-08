import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import * as FormDesignerActions from '../../actions/formDesignerActions/actions';
import FormDesignerActionDispatchers from '../../actions/formDesignerActions/formDesignerActionDispatcher';
import * as FormDesignerActionTypes from '../../actions/formDesignerActions/formDesignerActionTypes';
import { addToOrDeleteFromArray, sortArray } from '../../utils/arrayHelpers/arrayLogic';

export function* updateActiveListSaga({
  listItem,
  containerList,
}: FormDesignerActions.IUpdateActiveListAction): SagaIterator {
  let returnedList = null;
  containerList.length > 1 ? (returnedList = addToOrDeleteFromArray(),
  returnedList = returnedList({ object: listItem, array: containerList })) : returnedList = [];
  try {
    if (Array.isArray(returnedList)) {
      yield call(FormDesignerActionDispatchers.updateActiveListActionFulfilled, [...returnedList]);
    }
  } catch (err) {
    yield call(FormDesignerActionDispatchers.updateActiveListRejected, err);
  }
}

export function* watchUpdateActiveListSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.UPDATE_ACTIVE_LIST,
    updateActiveListSaga,
  );
}

export function* updateActiveOrderSaga({
  containerList,
  orderList,
}: FormDesignerActions.IUpdateActiveListOrderAction): SagaIterator {
  const key: any = Object.keys(orderList)[0];
  let returnedList = null;
  containerList.length > 1 ? (returnedList = sortArray(),
  returnedList = returnedList({array: containerList, order: orderList[key]})) : returnedList = [];
  try {
    if (returnedList.length > 0) {
      yield call(FormDesignerActionDispatchers.updateActiveListOrderActionFulfilled, returnedList);
    }
  } catch (err) {
    yield call(FormDesignerActionDispatchers.updateActiveListOrderRejected, err);
  }
}
export function* watchUpdateActiveOrderSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.UPDATE_ACTIVE_LIST_ORDER,
    updateActiveOrderSaga,
  );
}

export function* deleteActiveListSaga({
}: FormDesignerActions.IDeleteActiveListAction): SagaIterator {
  try {
    yield call(FormDesignerActionDispatchers.deleteActionListActionFulfilled);
  } catch (err) {
    yield call(FormDesignerActionDispatchers.deleteActionListActionRejected, err);
  }
}
export function* watchDeleteActiveListSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.DELETE_ACTIVE_LIST,
    deleteActiveListSaga,
  );
}
