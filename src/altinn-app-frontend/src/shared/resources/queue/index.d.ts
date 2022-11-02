export interface IQueueState {
  dataTask: IQueueTask;
  appTask: IQueueTask;
  userTask: IQueueTask;
  infoTask: IQueueTask;
  stateless: IQueueTask;
}

export interface IQueueTask {
  isDone: boolean | null;
  error: Error | null;
}

export interface IQueueError {
  error: Error;
}
