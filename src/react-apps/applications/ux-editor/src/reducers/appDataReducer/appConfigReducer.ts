import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as AppDataActions from '../../actions/appDataActions/actions';
import * as AppDataActionTypes from '../../actions/appDataActions/appDataActionTypes';

export interface IAppConfigState {
  designMode: boolean;
}

const initialState: IAppConfigState = {
  designMode: true,
};

const appConfigReducer: Reducer<IAppConfigState> = (
  state: IAppConfigState = initialState,
  action?: Action,
): IAppConfigState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case AppDataActionTypes.SET_DESIGN_MODE: {
      const { designMode } = action as AppDataActions.ISetDesignModeAction;
      let className = 'a-bgBlue flex-column d-flex';
      if (designMode) {
        className = 'a-bgWhite';
      }
      document.body.className = className;
      document.body.style.overflowY = 'hidden';
      return update<IAppConfigState>(state, {
        designMode: {
          $set: designMode,
        },
      });
    }

    default:
      return state;
  }
};

export default appConfigReducer;
