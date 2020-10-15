import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import { IRuntimeState } from 'src/types';
import { ILayoutComponent } from '..';
import FormLayoutActions from '../formLayoutActions';
import * as ActionTypes from '../formLayoutActionTypes';
import { IUpdateFocus, IUpdateAutoSave, IUpdateRepeatingGroups } from './updateFormLayoutActions';
import { ILayoutState } from '../formLayoutReducer';
import { IFormDataState } from '../../data/formDataReducer';
import FormDataActions from '../../data/formDataActions';
import { removeGroupData } from '../../../../utils/databindings';

const selectFormLayoutConnection = (state: IRuntimeState): ILayoutState => state.formLayout;
const selectFormData = (state: IRuntimeState): IFormDataState => state.formData;

function* updateFocus({ currentComponentId, step }: IUpdateFocus): SagaIterator {
  try {
    const formLayoutState: ILayoutState = yield select(selectFormLayoutConnection);
    if (currentComponentId) {
      const layout = formLayoutState.layouts[formLayoutState.uiConfig.currentView];
      const currentComponentIndex = layout
        .findIndex((component: ILayoutComponent) => component.id === currentComponentId);
      const focusComponentIndex = step ? currentComponentIndex + step : currentComponentIndex;
      const focusComponentId = focusComponentIndex > 0 ? layout[focusComponentIndex].id : null;
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

function* updateRepeatingGroupsSaga({
  layoutElementId,
  remove,
  index,
}: IUpdateRepeatingGroups) {
  try {
    const formLayoutState: ILayoutState = yield select(selectFormLayoutConnection);
    const currentCount = formLayoutState.uiConfig.repeatingGroups[layoutElementId].count;
    const updatedRepeatingGroups = {
      ...formLayoutState.uiConfig.repeatingGroups,
      [layoutElementId]: {
        count: remove ? currentCount - 1 : currentCount + 1,
      },
    };

    yield call(FormLayoutActions.updateRepeatingGroupsFulfilled, updatedRepeatingGroups);

    if (remove) {
      // Remove the form data associated with the group
      const formDataState: IFormDataState = yield select(selectFormData);
      const layout = formLayoutState.layouts[formLayoutState.uiConfig.currentView];
      const updatedFormData = removeGroupData(formDataState.formData, index,
        layout, layoutElementId, formLayoutState.uiConfig.repeatingGroups[layoutElementId].count);

      yield call(FormDataActions.fetchFormDataFulfilled, updatedFormData);
      yield call(FormDataActions.saveFormData);
    }
  } catch (err) {
    yield call(FormLayoutActions.updateRepeatingGroupsRejected, err);
  }
}

export function* watchUpdateFocusSaga(): SagaIterator {
  yield takeLatest(ActionTypes.UPDATE_FOCUS, updateFocus);
}

export function* watchUpdateAutoSave(): SagaIterator {
  yield takeLatest(ActionTypes.UPDATE_AUTO_SAVE, updateAutoSaveSaga);
}

export function* watchUpdateRepeatingGroupsSaga(): SagaIterator {
  yield takeLatest(ActionTypes.UPDATE_REPEATING_GROUPS, updateRepeatingGroupsSaga);
}
