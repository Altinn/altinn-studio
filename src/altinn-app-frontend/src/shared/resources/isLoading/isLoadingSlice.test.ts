import type { IIsLoadingState } from './isLoadingSlice';
import slice, { initialState, IsLoadingActions } from './isLoadingSlice';

describe('isLoadingSlice', () => {
  let state: IIsLoadingState;
  beforeAll(() => {
    state = initialState;
  });

  it('handles startDataTaskIsLoading action', () => {
    const nextState = slice.reducer(
      state,
      IsLoadingActions.startDataTaskIsLoading,
    );
    expect(nextState.dataTask).toBeTruthy();
  });

  it('handles finishDataTaskIsLoading action', () => {
    const nextState = slice.reducer(
      { dataTask: true, stateless: true },
      IsLoadingActions.finishDataTaskIsLoading,
    );
    expect(nextState.dataTask).toBeFalsy();
  });
});
