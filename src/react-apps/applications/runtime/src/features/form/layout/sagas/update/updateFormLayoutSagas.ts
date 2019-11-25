import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import { IRuntimeState } from 'src/types';
import { ILayoutComponent } from '../..';
import FormLayoutActions from '../../actions';
import * as ActionTypes from '../../actions/types';
import { IUpdateFocus } from '../../actions/update';
import { ILayoutState } from '../../reducer';

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

export function* watchUpdateFocusSaga(): SagaIterator {
  yield takeLatest(ActionTypes.UPDATE_FOCUS, updateFocus);
}
