import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as FormDesignerActions from '../../actions/formDesignerActions/actions';
import * as FormDesignerActionTypes from '../../actions/formDesignerActions/formDesignerActionTypes';

export interface IFormLayoutState extends IFormDesignerLayout {
  fetching: boolean;
  fetched: boolean;
  error: Error;
  unSavedChanges: boolean;
  saving: boolean;
}

const initialState: IFormLayoutState = {
  components: {},
  order: [],
  fetching: false,
  fetched: false,
  error: null,
  saving: false,
  unSavedChanges: false,
};

const formLayoutReducer: Reducer<IFormLayoutState> = (
  state: IFormLayoutState = initialState,
  action?: Action,
): IFormLayoutState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case FormDesignerActionTypes.ADD_FORM_COMPONENT_FULFILLED: {
      const { component, id, callback } = action as FormDesignerActions.IAddFormComponentActionFulfilled;
      if (callback) callback(component, id);
      return update<IFormLayoutState>(state, {
        components: {
          [id]: {
            $set: component,
          },
        },
        order: {
          $push: [id],
        },
      });
    }
    case FormDesignerActionTypes.ADD_FORM_COMPONENT_REJECTED: {
      const { error } = action as FormDesignerActions.IAddFormComponentActionRejected;
      return update<IFormLayoutState>(state, {
        error: {
          $set: error,
        },
      });
    }
    case FormDesignerActionTypes.DELETE_FORM_COMPONENT_FULFILLED: {
      const { id } = action as FormDesignerActions.IDeleteComponentAction;
      return update<IFormLayoutState>(state, {
        components: {
          $unset: [id],
        },
        order: {
          $splice: [[state.order.indexOf(id), 1]],
        },
        unSavedChanges: {
          $set: true,
        },
        error: {
          $set: null,
        },
      });
    }
    case FormDesignerActionTypes.DELETE_FORM_COMPONENT_REJECTED: {
      const { error } = action as FormDesignerActions.IDeleteComponentActionRejected;
      return update<IFormLayoutState>(state, {
        error: {
          $set: error,
        },
      });
    }
    case FormDesignerActionTypes.UPDATE_FORM_COMPONENT_FULFILLED: {
      const { updatedComponent, id } = action as FormDesignerActions.IUpdateFormComponentActionFulfilled;
      return update<IFormLayoutState>(state, {
        components: {
          [id]: {
            $apply: () => ({ ...updatedComponent }),
          },
        },
        unSavedChanges: {
          $set: true,
        },
      });
    }
    case FormDesignerActionTypes.UPDATE_FORM_COMPONENT_REJECTED: {
      const { error } = action as FormDesignerActions.IUpdateFormComponentActionRejected;
      return update<IFormLayoutState>(state, {
        error: {
          $set: error,
        },
      });
    }
    case FormDesignerActionTypes.FETCH_FORM_LAYOUT: {
      return update<IFormLayoutState>(state, {
        fetching: {
          $set: true,
        },
        fetched: {
          $set: false,
        },
        error: {
          $set: null,
        },
      });
    }
    case FormDesignerActionTypes.FETCH_FORM_LAYOUT_FULFILLED: {
      const { formLayout } = action as FormDesignerActions.IFetchFormLayoutFulfilledAction;
      return update<IFormLayoutState>(state, {
        components: {
          $set: formLayout.components,
        },
        order: {
          $set: formLayout.order,
        },
        fetching: {
          $set: false,
        },
        fetched: {
          $set: true,
        },
        error: {
          $set: null,
        },
      });
    }
    case FormDesignerActionTypes.FETCH_FORM_LAYOUT_REJECTED: {
      const { error } = action as FormDesignerActions.IFetchFormLayoutRejectedAction;
      return update<IFormLayoutState>(state, {
        fetching: {
          $set: false,
        },
        fetched: {
          $set: false,
        },
        error: {
          $set: error,
        },
      });
    }
    case FormDesignerActionTypes.SAVE_FORM_LAYOUT: {
      return update<IFormLayoutState>(state, {
        saving: {
          $set: true,
        },
      });
    }
    case FormDesignerActionTypes.SAVE_FORM_LAYOUT_FULFILLED: {
      return update<IFormLayoutState>(state, {
        saving: {
          $set: false,
        },
        unSavedChanges: {
          $set: false,
        },
      });
    }
    case FormDesignerActionTypes.SAVE_FORM_LAYOUT_REJECTED: {
      const { error } = action as FormDesignerActions.ISaveFormLayoutRejectedAction;
      return update<IFormLayoutState>(state, {
        saving: {
          $set: false,
        },
        unSavedChanges: {
          $set: true,
        },
        error: {
          $set: error,
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default formLayoutReducer;
