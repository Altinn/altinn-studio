import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as DeployActions from './deployActions';
import * as DeployActionTypes from './deployActionTypes';

export interface IDeployState {
  deploymentList: any;
  masterRepoStatus: any;
}

const initialState: IDeployState = {
  deploymentList: {
    at21: {
      items: [],
      fetchStatus: {
        error: null,
        success: null,
      },
    },
  },
  masterRepoStatus: null,
};

const deployReducer: Reducer<IDeployState> = (
  state: IDeployState = initialState,
  action?: Action,
): IDeployState => {
  if (!action) {
    return state;
  }
  switch (action.type) {

    case DeployActionTypes.FETCH_DEPLOYMENTS_FULFILLED: {
      const { result, env } = action as DeployActions.IFetchDeploymentsFulfilled;
      return update<IDeployState>(state, {
        deploymentList: {
          [env]: {
            fetchStatus: {
              success: {
                $set: true,
              },
            },
            items: {
              $set: result,
            },
          },
        },
      });
    }

    case DeployActionTypes.FETCH_DEPLOYMENTS_REJECTED: {
      const { result, env } = action as DeployActions.IFetchDeploymentsRejected;
      return update<IDeployState>(state, {
        deploymentList: {
          [env]: {
            fetchStatus: {
              error: {
                $set: result.message,
              },
              success: {
                $set: false,
              },
            },
          },
        },
      });
    }

    case DeployActionTypes.FETCH_MASTER_REPO_STATUS_FULFILLED: {
      const { result } = action as DeployActions.IFetchMasterRepoStatusFulfilled;
      return update<IDeployState>(state, {
        masterRepoStatus: {
          $set: result,
        },
      });
    }

    default: { return state; }
  }
};

export default deployReducer;
