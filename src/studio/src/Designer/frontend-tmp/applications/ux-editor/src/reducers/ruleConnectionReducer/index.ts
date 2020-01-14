import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as ManageJsonFileActions from '../../actions/manageServiceConfigurationActions/actions';
import * as ManageJsonFileActionTypes from '../../actions/manageServiceConfigurationActions/manageServiceConfigurationActionTypes';
import * as RuleConnectionActions from '../../actions/ruleConnectionActions/actions';
import * as RuleConnectionActionTypes from '../../actions/ruleConnectionActions/ruleConnectionActionTypes';

export interface IRuleConnectionState {
  ruleConnection: any;
  [key: string]: any;
}

const initialState: IRuleConnectionState = null;

const ruleConnectionReducer: Reducer<any> = (
  state: any = initialState,
  action?: Action,
): any => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case RuleConnectionActionTypes.ADD_RULE_CONNECTION_FULFILLED: {
      const { newConnection } = action as RuleConnectionActions.IAddRuleConnectionFulfilled;
      return update<any>(state, {
        $apply: () => ({
          ...state,
          ...newConnection,
        }),
      });
    }
    case RuleConnectionActionTypes.DEL_RULE_CONNECTION_FULFILLED: {
      const { newConnectionObj } = action as RuleConnectionActions.IDelRuleConnectionFulfilled;
      return update<any>(state, {
        $apply: () => ({
          ...newConnectionObj,
        }),
      });
    }
    case ManageJsonFileActionTypes.FETCH_JSON_FILE_FULFILLED: {
      const { data } = action as ManageJsonFileActions.IFetchJsonFileFulfilledAction;
      return update<any>(state, {
        $apply: () => ({
          ...state,
          ...data.ruleConnection,
        }),
      });
    }
    default:
      return state;
  }
};

export default ruleConnectionReducer;
