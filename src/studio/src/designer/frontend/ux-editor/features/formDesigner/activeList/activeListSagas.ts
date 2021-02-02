/* eslint-disable no-undef */
/* eslint-disable max-len */
/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
/* eslint-disable consistent-return */
import { SagaIterator } from 'redux-saga';
import { put, select, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { IFormDesignerState } from '../formDesignerReducer';
import { IAddActiveFormContainerAction, IUpdateActiveListAction } from '../formDesignerTypes';
import { FormLayoutActions } from '../formLayout/formLayoutSlice';
import { addToOrDeleteFromArray } from '../../../utils/arrayHelpers/arrayLogic';

const selectFormDesigner = (state: IAppState): IFormDesignerState => state.formDesigner;

export function* updateActiveListSaga({ payload }: PayloadAction<IUpdateActiveListAction>): SagaIterator {
  const {
    listItem,
    containerList,
  } = payload;
  let returnedList = [];
  const func = addToOrDeleteFromArray();
  containerList.length >= 1 ? returnedList = func({ array: containerList, object: listItem }) :
    returnedList.push(listItem);
  if (Array.isArray(returnedList)) {
    yield put(FormLayoutActions.updateActiveListFulfilled({ containerList: [...returnedList] }));
  }
}

export function* watchUpdateActiveListSaga(): SagaIterator {
  yield takeLatest(FormLayoutActions.updateActiveList, updateActiveListSaga);
}

function* addActiveFormContainerSaga({ payload }: PayloadAction<IAddActiveFormContainerAction>): SagaIterator {
  try {
    const { containerId } = payload;
    const formDesignerState: IFormDesignerState = yield select(selectFormDesigner);
    yield put(FormLayoutActions.addActiveFormContainerFulfilled({
      containerId: containerId === formDesignerState.layout.activeContainer ? '' : containerId,
    }));
  } catch (error) {
    yield put(FormLayoutActions.addFormComponentRejected({ error }));
  }
}

export function* watchAddActiveFormContainerSaga(): SagaIterator {
  yield takeLatest(FormLayoutActions.addActiveFormContainer, addActiveFormContainerSaga);
}

export function* deleteActiveListSaga(): SagaIterator {
  try {
    yield put(FormLayoutActions.deleteActiveListFulfilled());
  } catch (error) {
    yield put(FormLayoutActions.deleteActiveListRejected({ error }));
  }
}

export function* watchDeleteActiveListSaga(): SagaIterator {
  yield takeLatest(
    [
      FormLayoutActions.deleteActiveList,
      FormLayoutActions.updateSelectedLayout,
    ],
    deleteActiveListSaga,
  );
}
