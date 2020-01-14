import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as GetRepoStatusActions from './get/getMasterRepoStatusActions';
import * as RepoStatusActionTypes from './repoStatusActionTypes';

export interface IRepoStatusState {
  branch: IBranch;
}

export interface IBranch {
  master: any;
}

const initialState: IRepoStatusState = {
  branch: {
    master: null,
  },
};

const repoStatusReducer: Reducer<IRepoStatusState> = (
  state: IRepoStatusState = initialState,
  action?: Action,
): IRepoStatusState => {
  if (!action) {
    return state;
  }
  switch (action.type) {

    case RepoStatusActionTypes.GET_MASTER_REPO_STATUS_FULFILLED: {
      const { result } = action as GetRepoStatusActions.IGetMasterRepoStatusFulfilled;
      return update<IRepoStatusState>(state, {
        branch: {
          master: {
            $set: result,
          },
        },
      });
    }

    default: { return state; }
  }
};

export default repoStatusReducer;
