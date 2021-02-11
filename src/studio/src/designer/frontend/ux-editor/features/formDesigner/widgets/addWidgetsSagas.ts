/* eslint-disable import/no-cycle */
import { PayloadAction } from '@reduxjs/toolkit';
import { put, select, takeLatest } from 'redux-saga/effects';
import { v4 as uuidv4 } from 'uuid';
import { SagaIterator } from 'redux-saga';
import { FormLayoutActions } from '../formLayout/formLayoutSlice';
import { IAddWidgetAction } from '../formDesignerTypes';
import { convertFromLayoutToInternalFormat } from '../../../utils/formLayout';
import { addTextResources } from '../../appData/textResources/textResourcesSlice';

const selectCurrentLayoutId = (state: IAppState): string => state.formDesigner.layout.selectedLayout;
const selectCurrentLayout = (state: IAppState) => {
  return state.formDesigner.layout.layouts[state.formDesigner.layout.selectedLayout];
};

function* addWidgetSaga(action: PayloadAction<IAddWidgetAction>): SagaIterator {
  try {
    const {
      widget,
      position,
    } = action.payload;
    let { containerId } = action.payload;
    const layoutId: string = yield select(selectCurrentLayoutId);
    const currentLayout: IFormLayout = yield select(selectCurrentLayout);
    const internalComponents = convertFromLayoutToInternalFormat(widget.components);
    const components: any = { ...currentLayout.components };
    if (!containerId) {
      // if not containerId set it to base-container
      containerId = Object.keys(currentLayout.order)[0];
    }

    const containerOrder: string[] = [...(currentLayout.order[containerId])];
    const ids: string[] = [];
    Object.keys(internalComponents.components).forEach((id: string) => {
      const newId = uuidv4();
      internalComponents.components[id].id = newId;
      components[newId] = internalComponents.components[id];
      ids.push(newId);
    });
    containerOrder.splice(position, 0, ...ids);

    yield put(FormLayoutActions.addWidgetFulfilled({
      components,
      position,
      containerId,
      layoutId,
      containerOrder,
    }));

    yield put(FormLayoutActions.saveFormLayout());

    if (widget.texts && Object.keys(widget.texts).length > 0) {
      yield put(addTextResources({ textResources: widget.texts }));
    }
  } catch (error) {
    yield put(FormLayoutActions.addWidgetRejected({ error }));
  }
}

export function* watchAddWidgetSaga(): SagaIterator {
  yield takeLatest(FormLayoutActions.addWidget, addWidgetSaga);
}
