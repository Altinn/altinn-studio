import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface IErrorStateError {
  errorMessage: string;
}

export interface IErrorState {
  errorList: IErrorStateError[];
}

export interface IRemoveErrorAction {
  errorIndex: number;
}

const initialState: IErrorState = {
  errorList: [],
};

const errorSlice = createSlice({
  name: 'error',
  initialState,
  reducers: {
    addError: (state, action: PayloadAction<IErrorStateError>) => {
      const { errorMessage } = action.payload;
      state.errorList.push({ errorMessage });
    },
    removeError: (state, action: PayloadAction<IRemoveErrorAction>) => {
      const { errorIndex } = action.payload;
      state.errorList.splice(errorIndex, 1);
    },
  },
});

export const { addError, removeError } = errorSlice.actions;

export default errorSlice.reducer;
