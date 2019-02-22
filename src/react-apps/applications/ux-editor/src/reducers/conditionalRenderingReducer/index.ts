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
    case ConditionalRenderingActionTypes.ADD_CONDITIONAL_RENDERING_FULFILLED: {
      const { newConnection } = action as ConditionalRenderingActions.IAddConditionalRenderingFulfilled;
      return update<any>(state, {
        $apply: () => ({
          ...state,
          ...newConnection,
        }),
      });
    }
    case ConditionalRenderingActionTypes.DEL_CONDITIONAL_RENDERING_FULFILLED: {
      const { newConnectionObj } = action as ConditionalRenderingActions.IDelConditionalRenderingFulfilled;
      return update<any>(state, {
        $apply: () => ({
          ...newConnectionObj,
        }),
      });
    }
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
