import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as ConditionalRenderingActions from '../../actions/conditionalRenderingActions/actions';
import * as ConditionalRenderingActionTypes from '../../actions/conditionalRenderingActions/conditionalRenderingActionTypes';
import * as ManageJsonFileActions from '../../actions/manageServiceConfigurationActions/actions';
import * as ManageJsonFileActionTypes from '../../actions/manageServiceConfigurationActions/manageServiceConfigurationActionTypes';

export interface IConditionalRenderingState {
  conditionalRendering: any;
  [key: string]: any;
}

const initialState: IConditionalRenderingState = null;

const conditionalRenderingReducer: Reducer<any> = (
  state: any = initialState,
  action?: Action,
): any => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case ManageJsonFileActionTypes.FETCH_JSON_FILE_FULFILLED: {
      const { data } = action as ManageJsonFileActions.IFetchJsonFileFulfilledAction;
      return update<any>(state, {
        $set: data.conditionalRendering,
      });
    }
    default:
      return state;
  }
};

export default conditionalRenderingReducer;
