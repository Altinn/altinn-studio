import type { Reducer, ReducersMapObject } from 'redux';
import { combineReducers } from 'redux';
import appDataReducer from './features/appData/appDataReducers';
import formDesignerReducer from './features/formDesigner/formDesignerReducer';

import type { IFormDesignerNameSpace } from './types/global';
import type { IAppDataState } from './features/appData/appDataReducers';
import type { IFormDesignerState } from './features/formDesigner/formDesignerReducer';

export interface IReducers
  extends IFormDesignerNameSpace<Reducer<IFormDesignerState>, Reducer<IAppDataState>>,
    ReducersMapObject {}

export const rootReducer: IReducers = {
  formDesigner: formDesignerReducer,
  appData: appDataReducer,
};

export default combineReducers(rootReducer);
