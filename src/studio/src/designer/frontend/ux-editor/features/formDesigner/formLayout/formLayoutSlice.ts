/* eslint-disable no-param-reassign */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ILayoutSettings } from 'app-shared/types';
import * as FormLayoutTypes from '../formDesignerTypes';
import { actions, moduleName } from './formLayoutActions';
import { getLayoutSettingsSchemaUrl } from '../../../utils/urlHelper';
import { sortArray } from '../../../utils/arrayHelpers/arrayLogic';

export interface IFormLayoutState extends IFormDesignerLayout {
  fetching: boolean;
  fetched: boolean;
  error: Error;
  saving: boolean;
  unSavedChanges: boolean;
  activeContainer: string;
  activeList: any;
  selectedLayout: string;
  layoutSettings: ILayoutSettings;
}

const initialState: IFormLayoutState = {
  layouts: {},
  fetching: false,
  fetched: false,
  error: null,
  saving: false,
  unSavedChanges: false,
  activeContainer: '',
  activeList: [],
  selectedLayout: 'default',
  layoutSettings: { $schema: getLayoutSettingsSchemaUrl(), pages: { order: [] } },
};

const formLayoutSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    addActiveFormContainerFulfilled: (state, action: PayloadAction<FormLayoutTypes.IAddActiveFormContainerAction>) => {
      const { containerId, callback } = action.payload;
      if (callback) {
        callback(containerId);
      }
      state.activeContainer = containerId;
    },
    addApplicationMetadataRejected: (state, action: PayloadAction<FormLayoutTypes.IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    addFormComponentFulfilled: (state, action: PayloadAction<FormLayoutTypes.IAddFormComponentActionFulfilled>) => {
      const {
        component,
        id,
        position,
        containerId,
        callback,
      } = action.payload;

      if (callback) {
        callback(component, id);
      }

      const selectedLayout = state.layouts[state.selectedLayout];

      selectedLayout.components[id] = component;
      if (!selectedLayout.order[containerId]) {
        selectedLayout.order[containerId] = [];
      }
      state.layouts[state.selectedLayout].order[containerId].splice(position, 0, id);
    },
    addFormComponentRejected: (state, action: PayloadAction<FormLayoutTypes.IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    addFormComponentsFulfilled: (state, action: PayloadAction<FormLayoutTypes.IAddFormComponentsActionFulfilled>) => {
      const {
        components,
        ids,
        position,
        containerId,
        callback,
      } = action.payload;

      if (callback) {
        callback(components, ids);
      }
      const existingComponents = state.layouts[state.selectedLayout].components;
      state.layouts[state.selectedLayout].components = {
        ...existingComponents,
        ...components,
      };
      state.layouts[state.selectedLayout].order[containerId].splice(position, 0, ...ids);
    },
    addFormContainerFulfilled: (state, action: PayloadAction<FormLayoutTypes.IAddFormContainerActionFulfilled>) => {
      const {
        container,
        id,
        positionAfterId,
        addToId,
        baseContainerId,
        callback,
        destinationIndex,
      } = action.payload;

      if (callback) {
        callback(container, id);
      }

      const selectedLayout = state.layouts[state.selectedLayout];
      selectedLayout.containers[id] = container;
      selectedLayout.order[id] = [];

      if (!baseContainerId) return;

      if (addToId) {
        if (!destinationIndex === false || destinationIndex === 0) {
          selectedLayout.order[addToId].splice(destinationIndex, 0, id);
        } else {
          selectedLayout.order[addToId].push(id);
        }

        if (positionAfterId) {
          selectedLayout.order[baseContainerId].splice(
            selectedLayout.order[baseContainerId].indexOf(positionAfterId) + 1, 0, id,
          );
        }
      } else if (!destinationIndex === false || destinationIndex === 0) {
        selectedLayout.order[baseContainerId].splice(destinationIndex, 0, id);
      } else {
        selectedLayout.order[baseContainerId].push(id);
      }
    },
    addFormContainerRejected: (state, action: PayloadAction<FormLayoutTypes.IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    addLayoutFulfilled: (state, action: PayloadAction<FormLayoutTypes.IAddLayoutFulfilledAction>) => {
      const { layouts, layoutOrder } = action.payload;
      state.layouts = layouts;
      state.layoutSettings.pages.order = layoutOrder;
    },
    addLayoutRejected: (state, action: PayloadAction<FormLayoutTypes.IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    addWidgetFulfilled: (state, action: PayloadAction<FormLayoutTypes.IAddWidgetActionFulfilled>) => {
      const {
        components,
        containerId,
        layoutId,
        containerOrder,
      } = action.payload;

      state.layouts[layoutId].components = components;
      state.layouts[layoutId].order[containerId] = containerOrder;
    },
    addWidgetRejected: (state, action: PayloadAction<FormLayoutTypes.IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    deleteActiveListFulfilled: (state) => {
      state.activeList = [];
    },
    deleteActiveListRejected: (state, action: PayloadAction<FormLayoutTypes.IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    deleteApplicationMetadataRejected: (state, action: PayloadAction<FormLayoutTypes.IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    deleteFormComponentFulfilled: (state, action: PayloadAction<FormLayoutTypes.IDeleteComponentAction>) => {
      const { id, containerId } = action.payload;
      const selectedLayout = state.layouts[state.selectedLayout];
      delete selectedLayout.components[id];
      selectedLayout.order[containerId].splice(
        selectedLayout.order[containerId].indexOf(id), 1,
      );
      state.unSavedChanges = true;
      state.error = null;
    },
    deleteFormComponentRejected: (state, action: PayloadAction<FormLayoutTypes.IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    deleteFormComponents: (state, action: PayloadAction<FormLayoutTypes.IDeleteComponentsAction>) => {
      const { components } = action.payload;
      const selectedLayout = state.layouts[state.selectedLayout];
      components.forEach((id) => {
        let containerId = Object.keys(selectedLayout.order)[0];
        Object.keys(selectedLayout.order).forEach((cId) => {
          if (selectedLayout.order[cId].find((componentId) => componentId === id)) {
            containerId = cId;
          }
        });
        delete selectedLayout.components[id];
        selectedLayout.order[containerId].splice(
          selectedLayout.order[containerId].indexOf(id), 1,
        );
        state.unSavedChanges = true;
        state.error = null;
      });
    },
    deleteFormContainerFulfilled: (state, action: PayloadAction<FormLayoutTypes.IDeleteContainerAction>) => {
      const { id, parentContainerId } = action.payload;
      const selectedLayout = state.layouts[state.selectedLayout];
      delete selectedLayout.containers[id];
      delete selectedLayout.order[id];
      if (parentContainerId) {
        selectedLayout.order[parentContainerId].splice(
          selectedLayout.order[parentContainerId].indexOf(id), 1,
        );
      }

      state.unSavedChanges = true;
      state.error = null;
    },
    deleteFormContainerRejected: (state, action: PayloadAction<FormLayoutTypes.IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    deleteLayoutFulfilled: (state, action: PayloadAction<FormLayoutTypes.IDeleteLayoutAction>) => {
      const { layout } = action.payload;
      delete state.layouts[layout];
      const pageOrder = state.layoutSettings.pages.order;
      pageOrder.splice(pageOrder.indexOf(layout), 1);
      if (state.selectedLayout === layout) {
        state.selectedLayout = pageOrder[0];
      }
    },
    deleteLayoutRejected: (state, action: PayloadAction<FormLayoutTypes.IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    fetchFormLayout: (state) => {
      state.fetching = true;
      state.fetched = false;
      state.error = null;
    },
    fetchFormLayoutFulfilled: (state, action: PayloadAction<FormLayoutTypes.IFetchFormLayoutFulfilledAction>) => {
      const { formLayout } = action.payload;
      state.fetching = false;
      state.fetched = true;
      state.error = null;
      if (formLayout) {
        state.layouts = formLayout;
        state.layoutSettings.pages.order = Object.keys(formLayout);
      }
    },
    fetchFormLayoutRejected: (state, action: PayloadAction<FormLayoutTypes.IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.fetching = false;
      state.fetched = false;
      state.error = error;
    },
    fetchLayoutSettingsFulfilled: (
      state,
      action: PayloadAction<FormLayoutTypes.IFetchLayoutSettingsFulfilledAction>,
    ) => {
      const { settings } = action.payload;
      if (settings && settings.pages && settings.pages.order) {
        state.layoutSettings.pages.order = settings.pages.order;
      }
    },
    fetchLayoutSettingsRejected: (state, action: PayloadAction<FormLayoutTypes.IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    saveFormLayout: (state) => {
      state.saving = true;
    },
    saveFormLayoutFulfilled: (state) => {
      state.saving = false;
      state.unSavedChanges = false;
    },
    saveFormLayoutRejected: (state, action: PayloadAction<FormLayoutTypes.IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.saving = false;
      state.unSavedChanges = true;
      state.error = error;
    },
    updateActiveListFulfilled: (state, action: PayloadAction<FormLayoutTypes.IUpdateActiveListActionFulfilled>) => {
      const { containerList } = action.payload;
      state.activeList = containerList;
    },
    updateActiveListOrder: (state, action: PayloadAction<FormLayoutTypes.IUpdateActiveListOrderAction>) => {
      const { containerList, orderList } = action.payload;
      const key: any = Object.keys(orderList)[0];
      const func = sortArray();
      const returnedList = !containerList.length ? [] : func({ array: [...containerList], order: orderList[key] });
      if (returnedList.length > 0) {
        state.activeList = returnedList;
      }
    },
    updateApplicationMetadataRejected: (state, action: PayloadAction<FormLayoutTypes.IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    updateContainerId: (state, action: PayloadAction<FormLayoutTypes.IUpdateContainerIdFulfilled>) => {
      const { currentId, newId } = action.payload;
      const selectedLayout = state.layouts[state.selectedLayout];

      // update component id
      selectedLayout.containers[newId] = { ...selectedLayout.containers[currentId] };
      delete selectedLayout.containers[currentId];

      // update id in parent container order
      const parentContainer = Object.keys(selectedLayout.order).find((containerId: string) => {
        return (selectedLayout.order[containerId].indexOf(currentId) > -1);
      });
      const parentContainerOrder = selectedLayout.order[parentContainer];
      const containerIndex = parentContainerOrder.indexOf(currentId);
      parentContainerOrder[containerIndex] = newId;

      // update id of the containers order array
      selectedLayout.order[newId] = selectedLayout.order[currentId];
      delete selectedLayout.order[currentId];
    },
    // eslint-disable-next-line max-len
    updateFormComponent: (state, action: PayloadAction<FormLayoutTypes.IUpdateFormComponentActionFulfilled>) => {
      const { updatedComponent, id } = action.payload;
      const selectedLayoutComponents = state.layouts[state.selectedLayout].components;
      if (id !== updatedComponent.id) {
        const newId = updatedComponent.id;
        selectedLayoutComponents[newId] = {
          ...selectedLayoutComponents[id],
          ...updatedComponent,
        };
        delete selectedLayoutComponents[id];

        // update id in parent container order
        const selectedLayoutOrder = state.layouts[state.selectedLayout].order;
        const parentContainer = Object.keys(selectedLayoutOrder).find((containerId) => {
          return (selectedLayoutOrder[containerId].indexOf(id) > -1);
        });
        const parentContainerOrder = selectedLayoutOrder[parentContainer];
        const containerIndex = parentContainerOrder.indexOf(id);
        parentContainerOrder[containerIndex] = newId;

        // update id of the containers order array
        // selectedLayoutOrder[newId] = selectedLayoutOrder[id];
        // delete selectedLayoutOrder[id];
      } else {
        selectedLayoutComponents[id] = {
          ...selectedLayoutComponents[id],
          ...updatedComponent,
        };
      }
      state.unSavedChanges = true;
    },
    updateFormComponentOrder: (state, action: PayloadAction<FormLayoutTypes.IUpdateFormComponentOrderAction>) => {
      const { updatedOrder } = action.payload;
      state.layouts[state.selectedLayout].order = updatedOrder;
    },
    updateFormContainer: (state, action: PayloadAction<FormLayoutTypes.IUpdateFormContainerAction>) => {
      const { updatedContainer, id } = action.payload;
      const selectedLayoutContainers = state.layouts[state.selectedLayout].containers;
      selectedLayoutContainers[id] = {
        ...selectedLayoutContainers[id],
        ...updatedContainer,
      };
      state.unSavedChanges = true;
    },
    updateLayoutNameFulfilled: (state, action: PayloadAction<FormLayoutTypes.IUpdateLayoutNameAction>) => {
      const { oldName, newName } = action.payload;
      state.layouts[newName] = { ...state.layouts[oldName] };
      delete state.layouts[oldName];
      const pageOrder = state.layoutSettings.pages.order;
      pageOrder[pageOrder.indexOf(oldName)] = newName;
    },
    updateLayoutNameRejected: (state, action: PayloadAction<FormLayoutTypes.IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    updateLayoutOrder: (state, action: PayloadAction<FormLayoutTypes.IUpdateLayoutOrderAction>) => {
      const { layout, direction } = action.payload;
      const newOrder = [...state.layoutSettings.pages.order];
      const currentIndex = state.layoutSettings.pages.order.indexOf(layout);
      let destination: number;
      if (direction === 'up') {
        destination = currentIndex - 1;
      } else if (direction === 'down') {
        destination = currentIndex + 1;
      }
      newOrder.splice(currentIndex, 1);
      newOrder.splice(destination, 0, layout);
      state.layoutSettings.pages.order = newOrder;
    },
    updateSelectedLayout: (state, action: PayloadAction<FormLayoutTypes.IUpdateSelectedLayoutAction>) => {
      const { selectedLayout } = action.payload;
      state.selectedLayout = selectedLayout;
    },
  },
});

export const FormLayoutActions = {
  ...actions,
  ...formLayoutSlice.actions,
};

export default formLayoutSlice.reducer;
