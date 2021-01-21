import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import appDataReducer, { IAppDataState } from './appDataReducer';
import errorReducer, { IErrorState } from './errorReducer';
import formDesignerReducer, { IFormDesignerState } from './formDesignerReducer';
import serviceConfigurationReducer, { IServiceConfigurationState } from './serviceConfigurationReducer';
import thirdPartyComponentsReducer, { IThirdPartyComponentsState } from './thirdPartyComponentReducer';
import widgetsReducer, { IWidgetState } from '../features/widgets/widgetsSlice';

export interface IReducers
  extends IFormDesignerNameSpace<
  Reducer<IFormDesignerState>,
  Reducer<IServiceConfigurationState>,
  Reducer<IAppDataState>,
  Reducer<IErrorState>,
  Reducer<IThirdPartyComponentsState>,
  Reducer<IWidgetState>
  >,
  ReducersMapObject { }

const reducers: IReducers = {
  formDesigner: formDesignerReducer,
  serviceConfigurations: serviceConfigurationReducer,
  appData: appDataReducer,
  errors: errorReducer,
  thirdPartyComponents: thirdPartyComponentsReducer,
  widgets: widgetsReducer,
};

export default combineReducers(reducers);
