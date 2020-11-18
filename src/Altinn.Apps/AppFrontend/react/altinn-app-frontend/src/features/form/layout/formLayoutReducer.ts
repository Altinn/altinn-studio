import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IUiConfig } from 'src/types';
import { ILayouts } from './index';
import { IFetchFormLayoutFulfilled, IFetchFormLayoutRejected, IFetchFormLayoutSettingsFulfilled, IFetchFormLayoutSettingsRejected } from './fetch/fetchFormLayoutActions';
import * as ActionTypes from './formLayoutActionTypes';
import { IUpdateFocusFulfilled,
  IUpdateHiddenComponents,
  IUpdateAutoSave,
  IUpdateRepeatingGroupsFulfilled,
  IUpdateCurrentView } from './update/updateFormLayoutActions';

export interface ILayoutState {
  layouts: ILayouts;
  error: Error;
  uiConfig: IUiConfig;
}

const initialState: ILayoutState = {
  layouts: null,
  error: null,
  uiConfig: {
    focus: null,
    hiddenFields: [],
    autoSave: null,
    repeatingGroups: {},
    currentView: 'FormLayout',
    navigationConfig: {},
    layoutOrder: null,
  },
};

const LayoutReducer: Reducer<ILayoutState> = (
  state: ILayoutState = initialState,
  action?: Action,
): ILayoutState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case ActionTypes.FETCH_FORM_LAYOUT_FULFILLED: {
      const { layouts, navigationConfig } = action as IFetchFormLayoutFulfilled;
      return update<ILayoutState>(state, {
        layouts: {
          $set: layouts,
        },
        uiConfig: {
          navigationConfig: {
            $set: navigationConfig,
          },
          layoutOrder: {
            $set: Object.keys(layouts),
          },
        },
        error: {
          $set: null,
        },
      });
    }

    case ActionTypes.FETCH_FORM_LAYOUT_REJECTED: {
      const { error } = action as IFetchFormLayoutRejected;
      return update<ILayoutState>(state, {
        error: {
          $set: error,
        },
      });
    }

    case ActionTypes.UPDATE_FOCUS_FULFUILLED: {
      const { focusComponentId } = action as IUpdateFocusFulfilled;
      return update<ILayoutState>(state, {
        uiConfig: {
          focus: {
            $set: focusComponentId,
          },
        },
      });
    }

    case ActionTypes.UPDATE_REPEATING_GROUPS_FULFILLED: {
      const {
        repeatingGroups: repeatingGroup,
      } = action as IUpdateRepeatingGroupsFulfilled;
      return update<ILayoutState>(state, {
        uiConfig: {
          repeatingGroups: {
            $set: repeatingGroup,
          },
        },
      });
    }

    case ActionTypes.UPDATE_HIDDEN_COMPONENTS: {
      const { componentsToHide } = action as IUpdateHiddenComponents;
      return update<ILayoutState>(state, {
        uiConfig: {
          hiddenFields: {
            $set: componentsToHide,
          },
        },
      });
    }

    case ActionTypes.UPDATE_AUTO_SAVE: {
      const { autoSave } = action as IUpdateAutoSave;
      return update<ILayoutState>(state, {
        uiConfig: {
          autoSave: {
            $set: autoSave,
          },
        },
      });
    }

    case ActionTypes.UPDATE_CURRENT_VIEW: {
      const { newView } = action as IUpdateCurrentView;
      return update<ILayoutState>(state, {
        uiConfig: {
          currentView: {
            $set: newView,
          },
        },
      });
    }

    case ActionTypes.FETCH_FORM_LAYOUT_SETTINGS_FULFILLED: {
      const { settings } = action as IFetchFormLayoutSettingsFulfilled;
      return update<ILayoutState>(state, {
        uiConfig: {
          layoutOrder: (currentLayoutOrder) => {
            if (!settings || !settings.pages || !settings.pages.order) {
              return currentLayoutOrder;
            }
            return settings.pages.order;
          },
          currentView: (currentView) => {
            if (!settings || !settings.pages || !settings.pages.order) {
              return currentView;
            }
            return settings.pages.order[0];
          },
        },
      });
    }

    case ActionTypes.FETCH_FORM_LAYOUT_SETTINGS_REJECTED: {
      const { error } = action as IFetchFormLayoutSettingsRejected;
      return update<ILayoutState>(state, {
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

export default LayoutReducer;
