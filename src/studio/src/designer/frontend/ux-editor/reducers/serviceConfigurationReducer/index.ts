import { combineReducers, Reducer } from 'redux';
import conditionalRenderingReducer, { IConditionalRenderingState } from '../conditionalRenderingReducer';
import manageServiceConfigurationReducer,
{ IManageServiceConfigurationState } from '../manageServiceConfigurationReducer';
import ruleConnectionReducer, { IRuleConnectionState } from '../ruleConnectionReducer';

export interface IServiceConfigurationState {
  ruleConnection: IRuleConnectionState;
  conditionalRendering: IConditionalRenderingState;
  manageServiceConfiguration: IManageServiceConfigurationState;
  [key: string]: any;
}

const combinedReducers: Reducer<IServiceConfigurationState> = combineReducers({
  ruleConnection: ruleConnectionReducer,
  conditionalRendering: conditionalRenderingReducer,
  manageServiceConfiguration: manageServiceConfigurationReducer,
});

export default combinedReducers;
