import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as HandleMergeConflictActions from './handleMergeConflictActions';
import * as HandleMergeConflictActionTypes from './handleMergeConflictActionTypes';

export interface IHandleMergeConflictState {
  repoStatus: any;
}

const initialState: IHandleMergeConflictState = {
  repoStatus: {
    hasMergeConflict: null,
  },
};

const handleMergeConflictReducer: Reducer<IHandleMergeConflictState> = (
  state: IHandleMergeConflictState = initialState,
  action?: Action,
): IHandleMergeConflictState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case HandleMergeConflictActionTypes.FETCH_REPO_STATUS_FULFILLED: {
      const { result } = action as HandleMergeConflictActions.IFetchRepoStatusFulfilled;
      return update<IHandleMergeConflictState>(state, {
        repoStatus: {
          $set: result,
        },
      });
    }
    default: { return state; }
  }
};

export default handleMergeConflictReducer;
