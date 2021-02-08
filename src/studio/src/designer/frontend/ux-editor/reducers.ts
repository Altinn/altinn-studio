import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import appDataReducer, { IAppDataState } from './features/appData/appDataReducers';
import errorReducer, { IErrorState } from './features/error/errorSlice';
// eslint-disable-next-line import/no-cycle
import formDesignerReducer, { IFormDesignerState } from './features/formDesigner/formDesignerReducer';
import serviceConfigurationReducer from './features/serviceConfigurations/serviceConfigurationSlice';
import { IServiceConfigurationState } from './features/serviceConfigurations/serviceConfigurationTypes';
import widgetsReducer, { IWidgetState } from './features/widgets/widgetsSlice';

export interface IReducers
  extends IFormDesignerNameSpace<
  Reducer<IFormDesignerState>,
  Reducer<IServiceConfigurationState>,
  Reducer<IAppDataState>,
  Reducer<IErrorState>,
  Reducer<IWidgetState>
  >,
  ReducersMapObject { }

const reducers: IReducers = {
  formDesigner: formDesignerReducer,
  serviceConfigurations: serviceConfigurationReducer,
  appData: appDataReducer,
  errors: errorReducer,
  widgets: widgetsReducer,
};

export default combineReducers(reducers);
