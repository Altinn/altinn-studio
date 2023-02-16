import { initialState, QueueActions, queueSlice } from 'src/shared/resources/queue/queueSlice';
import type { IQueueState } from 'src/shared/resources/queue';

describe('queueSlice', () => {
  let state: IQueueState;
  beforeEach(() => {
    state = initialState;
  });

  it('handles startInitialAppTaskQueue action', () => {
    let nextState = queueSlice.reducer(state, QueueActions.startInitialAppTaskQueue);
    expect(nextState.appTask.isDone).toBeFalsy();
    nextState = queueSlice.reducer(nextState, QueueActions.startInitialAppTaskQueueFulfilled);
    expect(nextState.appTask.isDone).toBeTruthy();
    expect(nextState.appTask.error).toBeNull();
  });

  it('handles startInitialDataTaskQueue action', () => {
    let nextState = queueSlice.reducer(state, QueueActions.startInitialDataTaskQueue);
    expect(nextState.dataTask.isDone).toBeFalsy();
    nextState = queueSlice.reducer(nextState, QueueActions.startInitialDataTaskQueueFulfilled);
    expect(nextState.dataTask.isDone).toBeTruthy();
  });

  it('handles startInitialInfoTaskQueue action', () => {
    let nextState = queueSlice.reducer(state, QueueActions.startInitialInfoTaskQueue);
    expect(nextState.infoTask.isDone).toBeFalsy();
    nextState = queueSlice.reducer(nextState, QueueActions.startInitialInfoTaskQueueFulfilled);
    expect(nextState.infoTask.isDone).toBeTruthy();
  });

  it('handles error on app task queue', () => {
    const errorMessage = 'app task queue error';
    const nextState = queueSlice.reducer(state, QueueActions.appTaskQueueError({ error: new Error(errorMessage) }));
    expect(nextState.appTask.error).toBeTruthy();
    expect(nextState.appTask.error?.message).toEqual(errorMessage);
  });

  it('handles error on data task queue', () => {
    const errorMessage = 'data task queue error';
    const nextState = queueSlice.reducer(state, QueueActions.dataTaskQueueError({ error: new Error(errorMessage) }));
    expect(nextState.dataTask.error).toBeTruthy();
    expect(nextState.dataTask.error?.message).toEqual(errorMessage);
  });

  it('handles error on info task queue', () => {
    const errorMessage = 'info task queue error';
    const nextState = queueSlice.reducer(state, QueueActions.infoTaskQueueError({ error: new Error(errorMessage) }));
    expect(nextState.infoTask.error).toBeTruthy();
    expect(nextState.infoTask.error?.message).toEqual(errorMessage);
  });

  it('handles error on user task queue', () => {
    const errorMessage = 'user task queue error';
    const nextState = queueSlice.reducer(state, QueueActions.userTaskQueueError({ error: new Error(errorMessage) }));
    expect(nextState.userTask.error).toBeTruthy();
    expect(nextState.userTask.error?.message).toEqual(errorMessage);
  });
});
