import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as GetRepoStatusActions from './get/getMasterRepoStatusActions';
import * as RepoStatusActionTypes from './repoStatusActionTypes';

export interface IRepoStatusState {
  branch: IBranch;
  resettingLocalRepo: boolean;
}

export interface IBranch {
  master: any;
}

const initialState: IRepoStatusState = {
  branch: {
    master: null,
  },
  resettingLocalRepo: false,
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

    case RepoStatusActionTypes.RESET_LOCAL_REPO: {
      return update<IRepoStatusState>(state, {
        resettingLocalRepo: {
          $set: true,
        },
      });
    }

    case RepoStatusActionTypes.RESET_LOCAL_REPO_FULFILLED:
    case RepoStatusActionTypes.RESET_LOCAL_REPO_REJECTED: {
      return update<IRepoStatusState>(state, {
        resettingLocalRepo: {
          $set: false,
        },
      });
    }

    default: { return state; }
  }
};

export default repoStatusReducer;
