import { SagaIterator } from 'redux-saga';
import { put, select, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import type { IFormDesignerState } from '../formDesignerReducer';
import type { IAddActiveFormContainerAction } from '../formDesignerTypes';
import { FormLayoutActions } from '../formLayout/formLayoutSlice';
import type { IAppState } from '../../../types/global';

const selectFormDesigner = (state: IAppState): IFormDesignerState =>
  state.formDesigner;

function* addActiveFormContainerSaga({
  payload,
}: PayloadAction<IAddActiveFormContainerAction>): SagaIterator {
  try {
    const { containerId } = payload;
    const formDesignerState: IFormDesignerState = yield select(
      selectFormDesigner,
    );
    yield put(
      FormLayoutActions.addActiveFormContainerFulfilled({
        containerId:
          containerId === formDesignerState.layout.activeContainer
            ? ''
            : containerId,
      }),
    );
  } catch (error) {
    yield put(FormLayoutActions.addFormComponentRejected({ error }));
  }
}

export function* watchAddActiveFormContainerSaga(): SagaIterator {
  yield takeLatest(
    FormLayoutActions.addActiveFormContainer,
    addActiveFormContainerSaga,
  );
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
