/* eslint-disable no-param-reassign */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IThirdPartyComponentsState {
  components: any;
  error: Error;
}

const initialState: IThirdPartyComponentsState = {
  components: null,
  error: null,
};

export interface IFetchThirdPartyComponent {
  location: string;
}

export interface IFetchThirdPartyComponentFulfilled {
  components: any;
}

const thirdPartyComponentSlice = createSlice({
  name: 'thirdPartyComponent',
  initialState,
  reducers: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fetchThirdPartyComponents: (state, action: PayloadAction<IFetchThirdPartyComponent>) => {},
    fetchThirdPartyComponentsFulfilled: (state, action: PayloadAction<IFetchThirdPartyComponentFulfilled>) => {
      const { components } = action.payload;
      state.components = {
        ...state.components,
        ...components,
      };
    },
    fetchThirdPartyComponentsRejected: (state, action: PayloadAction<IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
  },
});

export const {
  fetchThirdPartyComponents,
  fetchThirdPartyComponentsFulfilled,
  fetchThirdPartyComponentsRejected,
} = thirdPartyComponentSlice.actions;

export default thirdPartyComponentSlice.reducer;
