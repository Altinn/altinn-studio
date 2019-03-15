// import update from 'immutability-helper';
import { Action, Reducer } from 'redux';

export interface ILayoutState {
  formLayout: [],
};

const initialState: ILayoutState = {
  formLayout: [],
};

const LayoutReducer: Reducer<ILayoutState> = (
  state: ILayoutState = initialState,
  action?: Action,
): ILayoutState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    default: {
      return state;
    };
  }
}

export default LayoutReducer;