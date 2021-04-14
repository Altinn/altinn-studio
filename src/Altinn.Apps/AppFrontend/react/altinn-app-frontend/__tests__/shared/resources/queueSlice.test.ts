import reducer, { IQueueState,
  initialState,
  startInitialAppTaskQueue,
  startInitialAppTaskQueueFulfilled,
  startInitialDataTaskQueue,
  startInitialDataTaskQueueFulfilled,
  startInitialInfoTaskQueue,
  startInitialInfoTaskQueueFulfilled } from '../../../src/shared/resources/queue/queueSlice';

describe('queueSlice', () => {
  let state: IQueueState;
  beforeAll(() => {
    // setup state
    state = initialState;
  });
  it('handles startInitialAppTaskQueue action', () => {
    let nextState = reducer(state, startInitialAppTaskQueue);
    expect(nextState.appTask.isDone).toBeFalsy();
    nextState = reducer(nextState, startInitialAppTaskQueueFulfilled);
    expect(nextState.appTask.isDone).toBeTruthy();
    expect(nextState.appTask.error).toBeNull();
  });
  it('handles startInitialDataTaskQueue action', () => {
    let nextState = reducer(state, startInitialDataTaskQueue);
    expect(nextState.dataTask.isDone).toBeFalsy();
    nextState = reducer(nextState, startInitialDataTaskQueueFulfilled);
    expect(nextState.dataTask.isDone).toBeTruthy();
  });
  it('handles startInitialInfoTaskQueue action', () => {
    let nextState = reducer(state, startInitialInfoTaskQueue);
    expect(nextState.infoTask.isDone).toBeFalsy();
    nextState = reducer(nextState, startInitialInfoTaskQueueFulfilled);
    expect(nextState.infoTask.isDone).toBeTruthy();
  });
});
