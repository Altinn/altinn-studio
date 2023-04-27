import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { actions, moduleName } from './formLayoutActions';
import { sortArray } from '../../../utils/arrayHelpers/arrayLogic';
import type {
  IAddActiveFormContainerAction,
  IAddLayoutFulfilledAction,
  IDeleteLayoutAction,
  IFormDesignerActionRejected,
  IUpdateActiveListActionFulfilled,
  IUpdateActiveListOrderAction,
} from '../formDesignerTypes';

export interface IFormLayoutState {
  error: Error;
  saving: boolean;
  unSavedChanges: boolean;
  activeContainer: string;
  activeList: any;
  selectedLayout: string;
  invalidLayouts: string[];
}

const initialState: IFormLayoutState = {
  error: null,
  saving: false,
  unSavedChanges: false,
  activeContainer: '',
  activeList: [],
  selectedLayout: 'default',
  invalidLayouts: [],
};

const formLayoutSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    addActiveFormContainerFulfilled: (
      state,
      action: PayloadAction<IAddActiveFormContainerAction>
    ) => {
      const { containerId, callback } = action.payload;
      if (callback) {
        callback(containerId);
      }
      state.activeContainer = containerId;
    },
    addLayoutFulfilled: (state, action: PayloadAction<IAddLayoutFulfilledAction>) => {
      const { layoutOrder, receiptLayoutName } = action.payload;
      state.selectedLayout = receiptLayoutName || layoutOrder[layoutOrder.length - 1];
    },
    addLayoutRejected: (state, action: PayloadAction<IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },

    addWidgetRejected: (state, action: PayloadAction<IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    deleteActiveListFulfilled: (state) => {
      state.activeList = [];
    },
    deleteActiveListRejected: (state, action: PayloadAction<IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    deleteApplicationMetadataRejected: (
      state,
      action: PayloadAction<IFormDesignerActionRejected>
    ) => {
      const { error } = action.payload;
      state.error = error;
    },
    deleteFormComponentRejected: (state, action: PayloadAction<IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    deleteLayoutFulfilled: (state, action: PayloadAction<IDeleteLayoutAction>) => {
      const { layout, pageOrder } = action.payload;
      if (state.selectedLayout === layout) {
        state.selectedLayout = pageOrder[0];
      }
    },
    deleteLayoutRejected: (state, action: PayloadAction<IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    setInvalidLayouts: (state, action: PayloadAction<string[]>) => {
      state.invalidLayouts = action.payload;
    },
    updateActiveListFulfilled: (state, action: PayloadAction<IUpdateActiveListActionFulfilled>) => {
      const { containerList } = action.payload;
      state.activeList = containerList;
    },
    updateActiveListOrder: (state, action: PayloadAction<IUpdateActiveListOrderAction>) => {
      const { containerList, orderList } = action.payload;
      const key: any = Object.keys(orderList)[0];
      const func = sortArray();
      const returnedList = !containerList.length
        ? []
        : func({ array: [...containerList], order: orderList[key] });
      if (returnedList.length > 0) {
        state.activeList = returnedList;
      }
    },
    updateApplicationMetadataRejected: (
      state,
      action: PayloadAction<IFormDesignerActionRejected>
    ) => {
      const { error } = action.payload;
      state.error = error;
    },
    updateSelectedLayout: (state, action: PayloadAction<string>) => {
      state.selectedLayout = action.payload;
    },
  },
});

export const FormLayoutActions = {
  ...actions,
  ...formLayoutSlice.actions,
};

export default formLayoutSlice.reducer;
