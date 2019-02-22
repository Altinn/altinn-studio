import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import appDataReducer, { IAppDataState } from './appDataReducer';
import errorReducer, { IErrorState } from './errorReducer';
import formDesignerReducer, { IFormDesignerState } from './formDesignerReducer';
import formFillerReducer, { IFormFillerState } from './formFillerReducer';
import serviceConfigurationReducer, { IServiceConfigurationState } from './serviceConfigurationReducer';
import thirdPartyComponentsReducer, { IThirdPartyComponentsState } from './thirdPartyComponentReducer';
import workflowReducer, { IWorkflowState } from './workflowReducer';

export interface IReducers
  extends IFormDesignerNameSpace<
  Reducer<IFormDesignerState>,
  Reducer<IFormFillerState>,
  Reducer<IServiceConfigurationState>,
  Reducer<IAppDataState>,
  Reducer<IErrorState>,
  Reducer<IThirdPartyComponentsState>,
  Reducer<IWorkflowState>
  >,
  ReducersMapObject { }

const reducers: IReducers = {
  formDesigner: formDesignerReducer,
  formFiller: formFillerReducer,
  serviceConfigurations: serviceConfigurationReducer,
  appData: appDataReducer,
  errors: errorReducer,
  thirdPartyComponents: thirdPartyComponentsReducer,
  workflow: workflowReducer,
};

export default combineReducers(reducers);
