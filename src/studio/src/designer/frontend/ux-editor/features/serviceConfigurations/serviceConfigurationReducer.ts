import { combineReducers, Reducer } from 'redux';
import conditionalRenderingReducer, { IConditionalRenderingState } from './conditionalRendering/conditionalRenderingSlice';
import manageServiceConfigurationReducer,
{ IManageServiceConfigurationState } from './manageServiceConfigurations/manageServiceConfigurationsSlice';
import ruleConnectionReducer, { IRuleConnectionState } from '../../reducers/ruleConnectionReducer';

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
