/* eslint-disable no-param-reassign */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IConditionalRenderingState {
  [key: string]: any;
}

const initialState: IConditionalRenderingState = null;

export interface IAddConditionalRendering {
  newConnection: any;
}

const conditionalRenderingSlice = createSlice({
  name: 'conditionalRendering',
  initialState,
  reducers: {
    addConditionalRenderingConnection: (state, action: PayloadAction<IAddConditionalRendering>) => {
      const { newConnection } = action.payload;
      state = {
        ...state,
        ...newConnection,
      };
    },
    deleteConditionalRenderingConnnection: (state, action) => {
      const { connectionId } = action.payload;
      const connectionsArray = Object.keys(state);
      const newConnectionsArray = connectionsArray.filter(
        (conditionalRendringCon: any) => conditionalRendringCon !== connectionId,
      );
      const newConnectionsObj = newConnectionsArray.reduce((acc: any, conditionalRendringCon: any) => {
        acc[conditionalRendringCon] = state[conditionalRendringCon];
        return acc;
      }, {});
      state = { ...newConnectionsObj };
    },
    fetchConditionalRendering: () => {},
    fetchConditionalRenderingFulfilled: (state, action) => {},
    fetchConditionalRenderingRejected: (state, action) => {},
  },
});

export const {
  addConditionalRenderingConnection,
  deleteConditionalRenderingConnnection,
} = conditionalRenderingSlice.actions;

export default conditionalRenderingSlice.reducer;
