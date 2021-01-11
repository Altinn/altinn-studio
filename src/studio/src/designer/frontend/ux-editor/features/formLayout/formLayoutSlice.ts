/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Action, createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as FormLayoutTypes from './formLayoutTypes';

export interface IFormLayoutState extends IFormDesignerLayout {
  fetching: boolean;
  fetched: boolean;
  error: Error;
  saving: boolean;
  unSavedChanges: boolean;
  activeContainer: string;
  activeList: any;
  selectedLayout: string;
  layoutOrder: string[];
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
  layoutOrder: [],
};

const formDesignerSlice = createSlice({
  name: 'formDesigner',
  initialState,
  reducers: {
    addActiveFormContainer: (state, action: PayloadAction<FormLayoutTypes.IAddActiveFormContainerAction>) => {},
    addActiveFormContainerFulfilled: (state, action: PayloadAction<FormLayoutTypes.IAddActiveFormContainerAction>) => {
      const { containerId, callback } = action.payload;
      if (callback) {
        callback(containerId);
      }
      state.activeContainer = containerId;
    },
    addFormComponent: (state, action: PayloadAction<FormLayoutTypes.IAddFormComponentAction>) => {},
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

      state.layouts[state.selectedLayout].components[id] = component;
      state.layouts[state.selectedLayout].order[containerId].splice(position, 0, id);
    },
    addFormComponentRejected: (state, action: PayloadAction<FormLayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    addFormComponents: (state, action: PayloadAction<FormLayoutTypes.IAddFormComponentsAction>) => {},
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
    addFormContainer: (state, action: PayloadAction<FormLayoutTypes.IAddFormContainerAction>) => {},
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
    addLayout: (state, action: PayloadAction<FormLayoutTypes.IAddLayoutAction>) => {},
    addLayoutFulfilled: (state, action: PayloadAction<FormLayoutTypes.IAddLayoutFulfilledAction>) => {
      const { layouts } = action.payload;
      state.layouts = layouts;
      state.layoutOrder = Object.keys(layouts);
    },
    addLayoutRejected: (state, action: PayloadAction<FormLayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    deleteActiveList: (state) => {},
    deleteActiveListFulfilled: (state) => {
      state.activeList = [];
    },
    deleteActiveListRejected: (state, action: PayloadAction<FormLayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    deleteFormComponent: (state, action: PayloadAction<FormLayoutTypes.IDeleteComponentAction>) => {},
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
    deleteFormComponentRejected: (state, action: PayloadAction<FormLayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    deleteFormContainer: (state, action: PayloadAction<FormLayoutTypes.IDeleteContainerAction>) => {},
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
    deleteFormContainerRejected: (state, action: PayloadAction<FormLayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    deleteLayout: (state, action: PayloadAction<FormLayoutTypes.IDeleteLayoutAction>) => {},
    deleteLayoutFulfilled: (state, action: PayloadAction<FormLayoutTypes.IDeleteLayoutAction>) => {
      const { layout } = action.payload;
      delete state.layouts[layout];
      state.layoutOrder.splice(state.layoutOrder.indexOf(layout), 1);
      if (state.selectedLayout === layout) {
        state.selectedLayout = state.layoutOrder[0];
      }
    },
    deleteLayoutRejected: (state, action: PayloadAction<FormLayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    fetchFormLayout: (state, action: PayloadAction<FormLayoutTypes.IFetchFormLayoutAction>) => {
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
        state.layoutOrder = Object.keys(formLayout);
      }
    },
    fetchFormLayoutRejected: (state, action: PayloadAction<FormLayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.fetching = false;
      state.fetched = false;
      state.error = error;
    },
    fetchLayoutSettings: () => {},
    // eslint-disable-next-line max-len
    fetchLayoutSettingsFulfilled: (state, action: PayloadAction<FormLayoutTypes.IFetchLayoutSettingsFulfilledAction>) => {
      const { settings } = action.payload;
      if (settings && settings.pages && settings.pages.order) {
        state.layoutOrder = settings.pages.order;
      }
    },
    fetchLayoutSettingsRejected: (state, action: PayloadAction<FormLayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    saveFormLayout: (state, action: Action) => {},
    saveFormLayoutFulfilled: (state) => {
      state.saving = false;
      state.unSavedChanges = false;
    },
    saveFormLayoutRejected: (state, action: PayloadAction<FormLayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.saving = false;
      state.unSavedChanges = true;
      state.error = error;
    },
    updateActiveList: (state, action: PayloadAction<FormLayoutTypes.IUpdateActiveListAction>) => {},
    updateActiveListFulfilled: (state, action: PayloadAction<FormLayoutTypes.IUpdateActiveListActionFulfilled>) => {
      const { containerList } = action.payload;
      state.activeList = containerList;
    },
    updateActiveListRejected: (state, action: PayloadAction<FormLayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    updateActiveListOrder: (state, action: PayloadAction<FormLayoutTypes.IUpdateActiveListOrderAction>) => {},
    updateActiveListOrderFulfilled: (state, action: PayloadAction<FormLayoutTypes.IUpdateActiveListOrderAction>) => {
      const { containerList } = action.payload;
      state.activeList = containerList;
    },
    updateActiveListOrderRejected: (state, action: PayloadAction<FormLayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    updateContainerId: (state, action: PayloadAction<FormLayoutTypes.IUpdateContainerIdAction>) => {},
    updateContainerIdFulfilled: (state, action: PayloadAction<FormLayoutTypes.IUpdateContainerIdFulfilled>) => {
      const { currentId, newId } = action.payload;
      const selectedLayout = state.layouts[state.selectedLayout];
      selectedLayout.containers[newId] = { ...selectedLayout.containers[currentId] };
      delete selectedLayout.containers[currentId];

      const parentContainer = Object.keys(selectedLayout.order).find((containerId: string) => {
        return (selectedLayout.order[containerId].indexOf(currentId) > -1);
      });
      const parentContainerOrder = selectedLayout.order[parentContainer];
      const containerIndex = parentContainerOrder.indexOf(currentId);
      parentContainerOrder[containerIndex] = newId;

      selectedLayout.order[newId] = selectedLayout.order[currentId];
      delete selectedLayout.order[currentId];
    },
    updateContainerIdRejected: (state, action: PayloadAction<FormLayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    updateFormComponent: (state, action: PayloadAction<FormLayoutTypes.IUpdateFormComponentAction>) => {},
    // eslint-disable-next-line max-len
    updateFormComponentFulfilled: (state, action: PayloadAction<FormLayoutTypes.IUpdateFormComponentActionFulfilled>) => {
      const { updatedComponent, id } = action.payload;
      const selectedLayoutComponents = state.layouts[state.selectedLayout].components;
      selectedLayoutComponents[id] = {
        ...selectedLayoutComponents[id],
        ...updatedComponent,
      };
      state.unSavedChanges = true;
    },
    updateFormComponentRejected: (state, action: PayloadAction<FormLayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    updateFormComponentOrder: (state, action: PayloadAction<FormLayoutTypes.IUpdateFormComponentOrderAction>) => {},
    // eslint-disable-next-line max-len
    updateFormComponentOrderFulfilled: (state, action: PayloadAction<FormLayoutTypes.IUpdateFormComponentOrderAction>) => {
      const { updatedOrder } = action.payload;
      state.layouts[state.selectedLayout].order = updatedOrder;
    },
    updateFormComponentOrderRejected: (state, action: PayloadAction<FormLayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    updateFormContainer: (state, action: PayloadAction<FormLayoutTypes.IUpdateFormContainerAction>) => {},
    updateFormContainerFulfilled: (state, action: PayloadAction<FormLayoutTypes.IUpdateFormContainerAction>) => {
      const { updatedContainer, id } = action.payload;
      const selectedLayoutContainers = state.layouts[state.selectedLayout].components;
      selectedLayoutContainers[id] = {
        ...selectedLayoutContainers[id],
        ...updatedContainer,
      };
      state.unSavedChanges = true;
    },
    updateFormContainerRejected: (state, action: PayloadAction<FormLayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    updateLayoutName: (state, action: PayloadAction<FormLayoutTypes.IUpdateLayoutNameAction>) => {},
    updateLayoutNameFulfilled: (state, action: PayloadAction<FormLayoutTypes.IUpdateLayoutNameAction>) => {
      const { oldName, newName } = action.payload;
      state.layouts[newName] = { ...state.layouts[oldName] };
      delete state.layouts[oldName];
      state.layoutOrder[state.layoutOrder.indexOf(oldName)] = newName;
    },
    updateLayoutNameRejected: (state, action: PayloadAction<FormLayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    updateLayoutOrder: (state, action: PayloadAction<FormLayoutTypes.IUpdateLayoutOrderAction>) => {},
    updateLayoutOrderFulfilled: (state, action: PayloadAction<FormLayoutTypes.IUpdateLayoutOrderAction>) => {
      const { layout, direction } = action.payload;
      const newOrder = [...state.layoutOrder];
      const currentIndex = state.layoutOrder.indexOf(layout);
      let destination: number;
      if (direction === 'up') {
        destination = currentIndex - 1;
      } else if (direction === 'down') {
        destination = currentIndex + 1;
      }
      newOrder.splice(currentIndex, 1);
      newOrder.splice(destination, 0, layout);
      state.layoutOrder = newOrder;
    },
    updateLayoutOrderRejected: (state, action: PayloadAction<FormLayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    updateSelectedLayout: (state, action: PayloadAction<FormLayoutTypes.IUpdateSelectedLayoutAction>) => {},
    updateSelectedLayoutFulfilled: (state, action: PayloadAction<FormLayoutTypes.IUpdateSelectedLayoutAction>) => {
      const { selectedLayout } = action.payload;
      state.selectedLayout = selectedLayout;
    },
    updateSelectedLayoutRejected: (state, action: PayloadAction<FormLayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
  },
});

export const {
  addActiveFormContainer,
  addActiveFormContainerFulfilled,
  addFormComponent,
  addFormComponentFulfilled,
  addFormComponentRejected,
  addFormComponents,
  addFormComponentsFulfilled,
  addFormContainer,
  addFormContainerFulfilled,
  addLayout,
  addLayoutFulfilled,
  addLayoutRejected,
  deleteActiveList,
  deleteActiveListFulfilled,
  deleteActiveListRejected,
  deleteFormComponent,
  deleteFormComponentFulfilled,
  deleteFormComponentRejected,
  deleteFormContainer,
  deleteFormContainerFulfilled,
  deleteFormContainerRejected,
  deleteLayout,
  deleteLayoutFulfilled,
  deleteLayoutRejected,
  fetchFormLayout,
  fetchFormLayoutFulfilled,
  fetchFormLayoutRejected,
  fetchLayoutSettings,
  fetchLayoutSettingsFulfilled,
  fetchLayoutSettingsRejected,
  saveFormLayout,
  saveFormLayoutFulfilled,
  saveFormLayoutRejected,
  updateActiveList,
  updateActiveListFulfilled,
  updateActiveListOrder,
  updateActiveListOrderFulfilled,
  updateActiveListOrderRejected,
  updateActiveListRejected,
  updateContainerId,
  updateContainerIdFulfilled,
  updateContainerIdRejected,
  updateFormComponent,
  updateFormComponentFulfilled,
  updateFormComponentOrder,
  updateFormComponentOrderFulfilled,
  updateFormComponentOrderRejected,
  updateFormComponentRejected,
  updateFormContainer,
  updateFormContainerFulfilled,
  updateFormContainerRejected,
  updateLayoutName,
  updateLayoutNameFulfilled,
  updateLayoutNameRejected,
  updateLayoutOrder,
  updateLayoutOrderFulfilled,
  updateLayoutOrderRejected,
  updateSelectedLayout,
  updateSelectedLayoutFulfilled,
  updateSelectedLayoutRejected,
} = formDesignerSlice.actions;

export default formDesignerSlice.reducer;
