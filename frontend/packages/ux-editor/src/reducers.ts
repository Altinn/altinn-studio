import type { Reducer, ReducersMapObject } from 'redux';
import { combineReducers } from 'redux';
import formDesignerReducer from './features/formDesigner/formDesignerReducer';

import type { IFormDesignerNameSpace } from './types/global';
import type { IFormDesignerState } from './features/formDesigner/formDesignerReducer';

export interface IReducers
  extends IFormDesignerNameSpace<Reducer<IFormDesignerState>>,
    ReducersMapObject {}

export const rootReducer: IReducers = {
  formDesigner: formDesignerReducer,
};

export default combineReducers(rootReducer);
