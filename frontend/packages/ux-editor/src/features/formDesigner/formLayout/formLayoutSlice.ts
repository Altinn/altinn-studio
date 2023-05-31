import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { actions, moduleName } from './formLayoutActions';
import type {
  IAddLayoutFulfilledAction,
  IDeleteLayoutAction,
  IFormDesignerActionRejected,
} from '../formDesignerTypes';

export interface IFormLayoutState {
  error: Error;
  saving: boolean;
  unSavedChanges: boolean;
  selectedLayout: string;
  selectedLayoutSet: string | null;
  invalidLayouts: string[];
}

const initialState: IFormLayoutState = {
  error: null,
  saving: false,
  unSavedChanges: false,
  selectedLayout: 'default',
  selectedLayoutSet: null,
  invalidLayouts: [],
};

const formLayoutSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
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
    updateSelectedLayoutSet: (state, action: PayloadAction<string>) => {
      state.selectedLayoutSet = action.payload;
    }
  },
});

export const FormLayoutActions = {
  ...actions,
  ...formLayoutSlice.actions,
};

export default formLayoutSlice.reducer;
