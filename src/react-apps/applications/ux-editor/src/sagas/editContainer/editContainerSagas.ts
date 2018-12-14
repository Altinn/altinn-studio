import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import * as FormDesignerActions from '../../actions/formDesignerActions/actions';
import FormDesignerActionDispatchers from '../../actions/formDesignerActions/formDesignerActionDispatcher';
import * as FormDesignerActionTypes from '../../actions/formDesignerActions/formDesignerActionTypes';
import { addToOrDeleteFromArray } from '../../utils/arrayHelpers/arrayLogic';

export function* updateContainerListSaga({
  listItem,
  containerList,
}: FormDesignerActions.IUpdateContainerListAction): SagaIterator {
  let returnedList = addToOrDeleteFromArray();
  returnedList = returnedList(listItem, containerList);
  try {
    if (returnedList !== null) {
      yield call(FormDesignerActionDispatchers.updateContainerListFulfilled, returnedList);
    }
  } catch (err) {
    yield call(FormDesignerActionDispatchers.updateContainerListRejected, err);
  }
})

export function* watchUpdateContainerListSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.UPDATE_CONTAINER_LIST,
    updateContainerListSaga,
  );
}
