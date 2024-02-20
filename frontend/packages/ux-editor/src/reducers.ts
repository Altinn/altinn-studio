import { combineReducers, type Reducer, type ReducersMapObject } from 'redux';
import appDataReducer, { type IAppDataState } from './features/appData/appDataReducers';
import formDesignerReducer, {
  type IFormDesignerState,
} from './features/formDesigner/formDesignerReducer';
import type { IFormDesignerNameSpace } from './types/global';

export interface IReducers
  extends IFormDesignerNameSpace<Reducer<IFormDesignerState>, Reducer<IAppDataState>>,
    ReducersMapObject {}

export const rootReducer: IReducers = {
  formDesigner: formDesignerReducer,
  appData: appDataReducer,
};

export default combineReducers(rootReducer);
