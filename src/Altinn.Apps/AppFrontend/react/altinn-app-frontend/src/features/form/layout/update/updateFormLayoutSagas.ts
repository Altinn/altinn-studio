import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import { IRuntimeState } from 'src/types';
import { ILayoutComponent } from '..';
import FormLayoutActions from '../formLayoutActions';
import * as ActionTypes from '../formLayoutActionTypes';
import { IUpdateFocus, IUpdateAutoSave } from './updateFormLayoutActions';
import { ILayoutState } from '../formLayoutReducer';

const selectFormLayoutConnection = (state: IRuntimeState): ILayoutState => state.formLayout;

function* updateFocus({ currentComponentId, step }: IUpdateFocus): SagaIterator {
  try {
    const formLayoutState: ILayoutState = yield select(selectFormLayoutConnection);
    if (currentComponentId) {
      const currentComponentIndex = formLayoutState.layout
          .findIndex((component: ILayoutComponent) => component.id === currentComponentId);
      const focusComponentIndex = step ? currentComponentIndex + step : currentComponentIndex;
      const focusComponentId = focusComponentIndex > 0 ? formLayoutState.layout[focusComponentIndex].id : null;
      yield call(FormLayoutActions.updateFocusFulfilled, focusComponentId);
    } else {
      yield call(FormLayoutActions.updateFocusFulfilled, null);
    }
  } catch (err) {
    yield call(FormLayoutActions.updateFocusRejected, err);
  }
}

function* updateAutoSaveSaga({ autoSave } : IUpdateAutoSave): SagaIterator {
  try {
    yield call(FormLayoutActions.updateAutoSaveFulfilled, autoSave);
  } catch (err) {
    yield call(FormLayoutActions.updateAutoSaveRejected, err);
  }
}

export function* watchUpdateFocusSaga(): SagaIterator {
  yield takeLatest(ActionTypes.UPDATE_FOCUS, updateFocus);
}

export function* watchUpdateAutoSave(): SagaIterator {
  yield takeLatest(ActionTypes.UPDATE_AUTO_SAVE, updateAutoSaveSaga);
}
