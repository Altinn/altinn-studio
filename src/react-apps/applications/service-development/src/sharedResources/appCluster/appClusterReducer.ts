import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as AppClusterActionTypes from './appClusterActionTypes';
import * as AppClusterActions from './getDeployments/getDeploymentsInAppClusterActions';

export interface IAppClusterState {
  deploymentList: any;
}

const initialState: IAppClusterState = {
  deploymentList: {
    at21: {
      items: [],
      getStatus: {
        error: null,
        success: null,
      },
    },
  },
};

const appClusterReducer: Reducer<IAppClusterState> = (
  state: IAppClusterState = initialState,
  action?: Action,
): IAppClusterState => {
  if (!action) {
    return state;
  }
  switch (action.type) {

    case AppClusterActionTypes.GET_DEPLOYMENTS_FULFILLED: {
      const { result, env } = action as AppClusterActions.IGetDeploymentsFulfilled;
      return update<IAppClusterState>(state, {
        deploymentList: {
          [env]: {
            getStatus: {
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

    case AppClusterActionTypes.GET_DEPLOYMENTS_REJECTED: {
      const { result, env } = action as AppClusterActions.IGetDeploymentsRejected;
      return update<IAppClusterState>(state, {
        deploymentList: {
          [env]: {
            getStatus: {
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

    default: { return state; }
  }
};

export default appClusterReducer;
