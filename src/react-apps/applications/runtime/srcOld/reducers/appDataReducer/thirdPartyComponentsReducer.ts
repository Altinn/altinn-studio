import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as AppDataActions from '../../actions/appDataActions/actions';
import * as AppDataActionTypes from '../../actions/appDataActions/appDataActionTypes';

export interface IThirdPartyComponentsState {
  components: any;
  error: Error;
}

const initialState: IThirdPartyComponentsState = {
  components: null,
  error: null,
};

const thirdPartyComponentsReducer: Reducer<IThirdPartyComponentsState> = (
  state: IThirdPartyComponentsState = initialState,
  action?: Action,
): any => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case AppDataActionTypes.FETCH_THIRD_PARTY_COMPONENTS_FULFILLED: {
      return update<IThirdPartyComponentsState>(state, {
        $merge: {
          components: (action as AppDataActions.IFetchThirdPartyComponentFulfilled).components,
        },
      });
    }
    case AppDataActionTypes.FETCH_THIRD_PARTY_COMPONENTS_REJECTED: {
      return update<IThirdPartyComponentsState>(state, {
        $set: {
          error: (action as AppDataActions.IFetchThirdPartyComponentRejected).error,
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default thirdPartyComponentsReducer;
