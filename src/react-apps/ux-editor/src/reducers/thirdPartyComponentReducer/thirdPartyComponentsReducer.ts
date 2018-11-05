import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IFetchThirdPartyComponentFulfilled, IFetchThirdPartyComponentRejected } from '../../actions/thirdPartyComponentsActions/actions';
import * as ThirdPartyComponentsActionTypes from '../../actions/thirdPartyComponentsActions/thirdPartyComponentsActionTypes';
import { IThirdPartyComponentsState } from './index';

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
    case ThirdPartyComponentsActionTypes.FETCH_THIRD_PARTY_COMPONENTS_FULFILLED: {
      return update<IThirdPartyComponentsState>(state, {
        $merge: {
          components: (action as IFetchThirdPartyComponentFulfilled).components,
        },
      });
    }
    case ThirdPartyComponentsActionTypes.FETCH_THIRD_PARTY_COMPONENTS_REJECTED: {
      return update<IThirdPartyComponentsState>(state, {
        $set: {
          error: (action as IFetchThirdPartyComponentRejected).error,
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default thirdPartyComponentsReducer;
