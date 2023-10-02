import { DataListsActions, dataListsSlice } from 'src/features/dataLists/dataListsSlice';
import type { IDataListsState } from 'src/features/dataLists/index';

export const testState: IDataListsState = {
  error: null,
};

describe('dataListSlice', () => {
  const slice = dataListsSlice();
  let state: IDataListsState;
  beforeEach(() => {
    state = testState;
  });

  it('handles fetchLanguageRejected action', () => {
    const errorMessage = 'This is an error';
    const nextState = slice.reducer(
      state,
      DataListsActions.fetchRejected({
        error: new Error(errorMessage),
      }),
    );
    expect(nextState.error?.message).toEqual(errorMessage);
  });
});
