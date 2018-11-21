import { combineReducers, Reducer } from 'redux';
import apiReducer, { IApiState } from '../apiReducer';
import conditionalRenderingReducer, { IConditionalRenderingState } from '../conditionalRenderingReducer';
import manageServiceConfigurationReducer,
{ IManageServiceConfigurationState } from '../manageServiceConfigurationReducer';
import ruleConnectionReducer, { IRuleConnectionState } from '../ruleConnectionReducer';

export interface IServiceConfigurationState {
  APIs: IApiState;
  ruleConnection: IRuleConnectionState;
  conditionalRendering: IConditionalRenderingState;
  manageServiceConfiguration: IManageServiceConfigurationState;
  [key: string]: any;
}

const combinedReducers: Reducer<IServiceConfigurationState> = combineReducers({
  APIs: apiReducer,
  ruleConnection: ruleConnectionReducer,
  conditionalRendering: conditionalRenderingReducer,
  manageServiceConfiguration: manageServiceConfigurationReducer,
});

export default combinedReducers;
