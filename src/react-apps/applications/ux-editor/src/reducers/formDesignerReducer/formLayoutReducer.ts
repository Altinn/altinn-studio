import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as FormDesignerActions from '../../actions/formDesignerActions/actions';
import * as FormDesignerActionTypes from '../../actions/formDesignerActions/formDesignerActionTypes';

export interface IFormLayoutState extends IFormDesignerLayout {
  fetching: boolean;
  fetched: boolean;
  error: Error;
  saving: boolean;
  unSavedChanges: boolean;
  activeContainer: string;
}

const initialState: IFormLayoutState = {
  components: {},
  containers: {},
  order: {},
  fetching: false,
  fetched: false,
  error: null,
  saving: false,
  unSavedChanges: false,
  activeContainer: '',

};

const formLayoutReducer: Reducer<IFormLayoutState> = (
  state: IFormLayoutState = initialState,
  action?: Action,
): IFormLayoutState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case FormDesignerActionTypes.ADD_ACTIVE_FORM_CONTAINER_FULFILLED: {
      const { containerId, callback } = action as FormDesignerActions.IAddActiveFormContainerActionFulfilled;
      if (callback) {
        callback(containerId);
      }

      return update<IFormLayoutState>(state, {
        activeContainer: {
          $set: containerId,
        },
      });
    }
    case FormDesignerActionTypes.ADD_FORM_COMPONENT_FULFILLED: {
      const {
        component,
        id,
        position,
        containerId,
        callback,
      } = action as FormDesignerActions.IAddFormComponentActionFulfilled;
      if (callback) {
        callback(component, id);
      }

      return update<IFormLayoutState>(state, {
        components: {
          [id]: {
            $set: component,
          },
        },
        order: {
          [containerId]: {
            $splice: [[position, 0, id]],
          },
        },
      });
    }
    case FormDesignerActionTypes.ADD_FORM_CONTAINER_FULFILLED: {
      const {
        container,
        id,
        positionAfterId,
        addToId,
        baseContainerId,
        callback,
      } = action as FormDesignerActions.IAddFormContainerActionFulfilled;
      if (callback) {
        callback(container, id);
      }
      if (!baseContainerId) {
        return update<IFormLayoutState>(state, {
          containers: {
            [id]: {
              $set: container,
            },
          },
          order: {
            [id]: {
              $set: [],
            },
          },
        });
      }
      if (addToId && positionAfterId) {
        return update<IFormLayoutState>(state, {
          containers: {
            [id]: {
              $set: container,
            },
          },
          order: {
            [id]: {
              $set: [],
            },
            [addToId]: {
              $push: [id],
            },
            [baseContainerId]: {
              $splice: [[state.order[baseContainerId].indexOf(positionAfterId) + 1, 0, id]],
            },
          },
        });
      }
      if (addToId) {
        return update<IFormLayoutState>(state, {
          containers: {
            [id]: {
              $set: container,
            },
          },
          order: {
            [id]: {
              $set: [],
            },
            [addToId]: {
              $push: [id],
            },
          },
        });
      }
      return update<IFormLayoutState>(state, {
        containers: {
          [id]: {
            $set: container,
          },
        },
        order: {
          [id]: {
            $set: [],
          },
          [baseContainerId]: {
            $push: [id],
          },
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
      const { id, containerId } = action as FormDesignerActions.IDeleteComponentActionFulfilled;
      return update<IFormLayoutState>(state, {
        components: {
          $unset: [id],
        },
        order: {
          [containerId]: {
            $splice: [[state.order[containerId].indexOf(id), 1]],
          },
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
    case FormDesignerActionTypes.DELETE_FORM_CONTAINER_FULFILLED: {
      const { id } = action as FormDesignerActions.IDeleteComponentActionFulfilled;
      return update<IFormLayoutState>(state, {
        containers: {
          $unset: [id],
        },
        order: {
          $unset: [id],
        },
        unSavedChanges: {
          $set: true,
        },
        error: {
          $set: null,
        },
      });
    }
    case FormDesignerActionTypes.DELETE_FORM_CONTAINER_REJECTED: {
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
    case FormDesignerActionTypes.UPDATE_FORM_CONTAINER_FULFILLED: {
      const { updatedContainer, id } = action as FormDesignerActions.IUpdateFormContainerActionFulfilled;
      return update<IFormLayoutState>(state, {
        containers: {
          [id]: {
            $apply: () => ({ ...updatedContainer }),
          },
        },
        unSavedChanges: {
          $set: true,
        },
      });
    }

    case FormDesignerActionTypes.UPDATE_FORM_CONTAINER_REJECTED: {
      const { error } = action as FormDesignerActions.IUpdateFormContainerActionRejected;
      return update<IFormLayoutState>(state, {
        error: {
          $set: error,
        },
      });
    }

    case FormDesignerActionTypes.FETCH_FORM_LAYOUT_FULFILLED: {
      const { formLayout } = action as FormDesignerActions.IFetchFormLayoutFulfilledAction;
      return update<IFormLayoutState>(state, {
        components: {
          $set: formLayout.components,
        },
        containers: {
          $set: formLayout.containers,
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
    case FormDesignerActionTypes.UPDATE_FORM_COMPONENT_ORDER_FULFILLED: {
      const { updatedOrder, containerId } = action as FormDesignerActions.IUpdateFormComponentOrderActionFulfilled;
      if (!containerId) {
        return update<IFormLayoutState>(state, {
          order: {
            $set: updatedOrder,
          },
        });
      }
      return update<IFormLayoutState>(state, {
        order: {
          [containerId]: {
            $set: updatedOrder,
          },
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default formLayoutReducer;
