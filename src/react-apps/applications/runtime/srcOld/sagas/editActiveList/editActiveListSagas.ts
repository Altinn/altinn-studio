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
  let returnedList = [];
  const func = addToOrDeleteFromArray();
  containerList.length >= 1 ? returnedList = func({ array: containerList, object: listItem }) :
    returnedList.push(listItem);
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
  const func = sortArray();
  containerList.length >= 1 ? returnedList = func({ array: containerList, order: orderList[key] }) : returnedList = [];
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

export function* deleteActiveListSaga(): SagaIterator {
  try {
    yield call(FormDesignerActionDispatchers.deleteActiveListActionFulfilled);
  } catch (err) {
    yield call(FormDesignerActionDispatchers.deleteActiveListActionRejected, err);
  }
}
export function* watchDeleteActiveListSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.DELETE_ACTIVE_LIST,
    deleteActiveListSaga,
  );
}
