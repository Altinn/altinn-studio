import reducer, { IQueueState,
  initialState,
  startInitialAppTaskQueue,
  startInitialAppTaskQueueFulfilled,
  startInitialDataTaskQueue,
  startInitialDataTaskQueueFulfilled,
  startInitialInfoTaskQueue,
  startInitialInfoTaskQueueFulfilled,
  appTaskQueueError,
  dataTaskQueueError,
  infoTaskQueueError } from '../../../../src/shared/resources/queue/queueSlice';

describe('queueSlice', () => {
  let state: IQueueState;
  beforeEach(() => {
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
  it('handles error on app task queue', () => {
    const errorMessage = 'app task queue error';
    const nextState = reducer(state, appTaskQueueError({ error: new Error(errorMessage) }));
    expect(nextState.appTask.error).toBeTruthy();
    expect(nextState.appTask.error.message).toEqual(errorMessage);
  });
  it('handles error on data task queue', () => {
    const errorMessage = 'data task queue error';
    const nextState = reducer(state, dataTaskQueueError({ error: new Error(errorMessage) }));
    expect(nextState.dataTask.error).toBeTruthy();
    expect(nextState.dataTask.error.message).toEqual(errorMessage);
  });
  it('handles error on info task queue', () => {
    const errorMessage = 'info task queue error';
    const nextState = reducer(state, infoTaskQueueError({ error: new Error(errorMessage) }));
    expect(nextState.infoTask.error).toBeTruthy();
    expect(nextState.infoTask.error.message).toEqual(errorMessage);
  });
});
