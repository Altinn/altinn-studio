/* eslint-disable import/no-cycle */
import { call, put, select, takeLatest } from 'redux-saga/effects';
import { v4 as uuidv4 } from 'uuid';
import { SagaIterator } from 'redux-saga';
import { addWidget, addWidgetFulfilled, addWidgetRejected, IAddWidgetAction, IAddWidgetActionFulfilled } from './addWidgetActions';
import { convertFromLayoutToInternalFormat } from '../../../utils/formLayout';
import FormDesignerActionDispatchers from '../../../actions/formDesignerActions/formDesignerActionDispatcher';
import { addTextResources } from '../../appData/textResources/textResourcesSlice';

export interface IAddWidget {
  payload: IAddWidgetAction;
  type: string;
}

export interface IAddWidgetFulfilled {
  payload: IAddWidgetActionFulfilled;
  type: string;
}

const selectCurrentLayoutId = (state: IAppState): string => state.formDesigner.layout.selectedLayout;
const selectCurrentLayout = (state: IAppState) => {
  return state.formDesigner.layout.layouts[state.formDesigner.layout.selectedLayout];
};

function* addWidgetSaga(action: IAddWidget): SagaIterator {
  try {
    const {
      widget,
      position,
      containerId,
    } = action.payload;
    const layoutId: string = yield select(selectCurrentLayoutId);
    const currentLayout: IFormLayout = yield select(selectCurrentLayout);
    const internalComponents = convertFromLayoutToInternalFormat(widget.components);
    const components: any = { ...currentLayout.components };
    const containerOrder: string[] = [...(currentLayout.order[containerId])];
    const ids: string[] = [];
    Object.keys(internalComponents.components).forEach((id: string) => {
      const newId = uuidv4();
      internalComponents.components[id].id = newId;
      components[newId] = internalComponents.components[id];
      ids.push(newId);
    });
    containerOrder.splice(position, 0, ...ids);

    yield put(addWidgetFulfilled({
      components,
      position,
      containerId,
      layoutId,
      containerOrder,
    }));

    yield call(FormDesignerActionDispatchers.saveFormLayout);

    if (widget.texts && Object.keys(widget.texts).length > 0) {
      yield put(addTextResources({ textResources: widget.texts }));
    }
  } catch (error) {
    yield put(addWidgetRejected({ error }));
  }
}

export function* watchAddWidgetSaga(): SagaIterator {
  yield takeLatest(addWidget.type, addWidgetSaga);
}
