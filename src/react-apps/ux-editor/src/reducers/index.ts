import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import appDataReducer, { IAppDataState } from './appDataReducer';
import errorReducer, { IErrorState } from './errorReducer';
import formDesignerReducer, { IFormDesignerState } from './formDesignerReducer';
import formFillerReducer, { IFormFillerState } from './formFillerReducer';
import serviceConfigurationReducer, { IServiceConfigurationState } from './serviceConfigurationReducer';
import thirdPartyComponentsReducer, { IThirdPartyComponentsState } from './thirdPartyComponentReducer';

export interface IReducers
  extends IFormDesignerNameSpace<
  Reducer<IFormDesignerState>,
  Reducer<IFormFillerState>,
  Reducer<IServiceConfigurationState>,
  Reducer<IAppDataState>,
  Reducer<IErrorState>,
  Reducer<IThirdPartyComponentsState>
  >,
  ReducersMapObject { }

const reducers: IReducers = {
  formDesigner: formDesignerReducer,
  formFiller: formFillerReducer,
  serviceConfigurations: serviceConfigurationReducer,
  appData: appDataReducer,
  errors: errorReducer,
  thirdPartyComponents: thirdPartyComponentsReducer,
};

export default combineReducers(reducers);
