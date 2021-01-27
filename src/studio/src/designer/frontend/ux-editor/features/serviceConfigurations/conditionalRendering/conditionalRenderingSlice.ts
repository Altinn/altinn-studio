/* eslint-disable no-param-reassign */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IConditionalRenderingState {
  [key: string]: IConditionalRendering;
}

export interface IConditionalRendering {
  selectedFields: ISelectedFields;
  selectedAction: string;
  selectedFunction: string;
  inputParams: IInputParams;
}

export interface ISelectedFields {
  [key: string]: string;
}

export interface IInputParams {
  [key: string]: string;
}

const initialState: IConditionalRenderingState = null;

export interface IAddConditionalRendering {
  newConnection: any;
}

export interface ISetConditionalRendering {
  conditionalRenderingConnections: IConditionalRenderingState;
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
    setConditionalRenderingConnections: (state, action: PayloadAction<ISetConditionalRendering>) => {
      const { conditionalRenderingConnections } = action.payload;
      state = { ...conditionalRenderingConnections };
    },
  },
});

export const {
  addConditionalRenderingConnection,
  deleteConditionalRenderingConnnection,
  setConditionalRenderingConnections,
} = conditionalRenderingSlice.actions;

export default conditionalRenderingSlice.reducer;
