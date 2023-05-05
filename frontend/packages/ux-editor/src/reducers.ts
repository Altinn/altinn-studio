import type { Reducer, ReducersMapObject } from 'redux';
import { combineReducers } from 'redux';
import appDataReducer from './features/appData/appDataReducers';
import errorReducer from './features/error/errorSlice';
import formDesignerReducer from './features/formDesigner/formDesignerReducer';
import widgetsReducer from './features/widgets/widgetsSlice';

import type { IWidgetState } from './features/widgets/widgetsSlice';
import type { IFormDesignerNameSpace } from './types/global';
import type { IAppDataState } from './features/appData/appDataReducers';
import type { IErrorState } from './features/error/errorSlice';
import type { IFormDesignerState } from './features/formDesigner/formDesignerReducer';

export interface IReducers
  extends IFormDesignerNameSpace<
      Reducer<IFormDesignerState>,
      Reducer<IAppDataState>,
      Reducer<IErrorState>,
      Reducer<IWidgetState>
    >,
    ReducersMapObject {}

const reducers: IReducers = {
  formDesigner: formDesignerReducer,
  appData: appDataReducer,
  errors: errorReducer,
  widgets: widgetsReducer,
};

export default combineReducers(reducers);
