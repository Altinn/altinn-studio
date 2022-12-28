import type { Reducer, ReducersMapObject } from 'redux';
import { combineReducers } from 'redux';
import appDataReducer from './features/appData/appDataReducers';
import errorReducer from './features/error/errorSlice';
import formDesignerReducer from './features/formDesigner/formDesignerReducer';
import serviceConfigurationReducer from './features/serviceConfigurations/serviceConfigurationSlice';
import widgetsReducer from './features/widgets/widgetsSlice';

import type { IWidgetState } from './features/widgets/widgetsSlice';
import type { IFormDesignerNameSpace } from './types/global';
import type { IAppDataState } from './features/appData/appDataReducers';
import type { IErrorState } from './features/error/errorSlice';
import type { IFormDesignerState } from './features/formDesigner/formDesignerReducer';
import type { IServiceConfigurationState } from './features/serviceConfigurations/serviceConfigurationTypes';

export interface IReducers
  extends IFormDesignerNameSpace<
      Reducer<IFormDesignerState>,
      Reducer<IServiceConfigurationState>,
      Reducer<IAppDataState>,
      Reducer<IErrorState>,
      Reducer<IWidgetState>
    >,
    ReducersMapObject {}

const reducers: IReducers = {
  formDesigner: formDesignerReducer,
  serviceConfigurations: serviceConfigurationReducer,
  appData: appDataReducer,
  errors: errorReducer,
  widgets: widgetsReducer,
};

export default combineReducers(reducers);
