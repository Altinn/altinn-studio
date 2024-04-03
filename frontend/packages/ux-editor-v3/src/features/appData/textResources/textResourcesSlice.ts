import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface ITextResourcesState {
  currentEditId?: string;
}

const initialState: ITextResourcesState = {
  currentEditId: undefined,
};

const textResourcesSlice = createSlice({
  name: 'textResources',
  initialState,
  reducers: {
    setCurrentEditId: (state, action: PayloadAction<string>) => {
      const { payload } = action;
      state.currentEditId = payload;
    },
  },
});

export const { setCurrentEditId } = textResourcesSlice.actions;

export default textResourcesSlice.reducer;
