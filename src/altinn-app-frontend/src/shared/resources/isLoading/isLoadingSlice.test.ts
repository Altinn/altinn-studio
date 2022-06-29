import type { IIsLoadingState } from './isLoadingSlice';
import reducer, {
  initialState,
  startDataTaskIsLoading,
  finishDataTaskIsLoading,
} from './isLoadingSlice';

describe('isLoadingSlice', () => {
  let state: IIsLoadingState;
  beforeAll(() => {
    state = initialState;
  });

  it('handles startDataTaskIsLoading action', () => {
    const nextState = reducer(state, startDataTaskIsLoading);
    expect(nextState.dataTask).toBeTruthy();
  });

  it('handles finishDataTaskIsLoading action', () => {
    const nextState = reducer(
      { dataTask: true, stateless: true },
      finishDataTaskIsLoading,
    );
    expect(nextState.dataTask).toBeFalsy();
  });
});
