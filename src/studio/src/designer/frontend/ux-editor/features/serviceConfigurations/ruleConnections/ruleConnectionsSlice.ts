/* eslint-disable no-param-reassign */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IRuleConnectionState {
  [key: string]: IRuleConnection;
}

export interface IRuleConnection {
  selectedFunction: string;
  inputParams: IRuleParams;
  outParams: IRuleParams;
}

export interface IRuleParams {
  [key: string]: string;
}

const initialState: IRuleConnectionState = null;

export interface IAddRuleConnection {
  newConnection: any;
}

export interface ISetRuleConnection {
  ruleConnections: IRuleConnectionState;
}

const conditionalRenderingSlice = createSlice({
  name: 'conditionalRendering',
  initialState,
  reducers: {
    addRuleConnection: (state, action: PayloadAction<IAddRuleConnection>) => {
      const { newConnection } = action.payload;
      state = {
        ...state,
        ...newConnection,
      };
    },
    deleteRuleConnnection: (state, action) => {
      const { connectionId } = action.payload;
      const connectionsArray = Object.keys(state);
      const newConnectionsArray = connectionsArray.filter(
        (connection: any) => connection !== connectionId,
      );
      const newConnectionsObj = newConnectionsArray.reduce((acc: any, connection: any) => {
        acc[connection] = state[connection];
        return acc;
      }, {});
      state = { ...newConnectionsObj };
    },
    setRuleConnections: (state, action: PayloadAction<ISetRuleConnection>) => {
      const { ruleConnections } = action.payload;
      state = { ...ruleConnections };
    },
  },
});

export const {
  addRuleConnection,
  deleteRuleConnnection,
  setRuleConnections,
} = conditionalRenderingSlice.actions;

export default conditionalRenderingSlice.reducer;
