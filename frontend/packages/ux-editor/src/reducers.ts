import type { Reducer, ReducersMapObject } from 'redux';
import { combineReducers } from 'redux';
import appDataReducer from './features/appData/appDataReducers';
import errorReducer from './features/error/errorSlice';
import formDesignerReducer from './features/formDesigner/formDesignerReducer';

import type { IFormDesignerNameSpace } from './types/global';
import type { IAppDataState } from './features/appData/appDataReducers';
import type { IErrorState } from './features/error/errorSlice';
import type { IFormDesignerState } from './features/formDesigner/formDesignerReducer';

export interface IReducers
  extends IFormDesignerNameSpace<
      Reducer<IFormDesignerState>,
      Reducer<IAppDataState>,
      Reducer<IErrorState>
    >,
    ReducersMapObject {}

const reducers: IReducers = {
  formDesigner: formDesignerReducer,
  appData: appDataReducer,
  errors: errorReducer,
};

export default combineReducers(reducers);
