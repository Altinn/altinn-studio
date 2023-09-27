export interface IQueueState {
  dataTask: IQueueTask;
  appTask: IQueueTask;
  userTask: IQueueTask;
  infoTask: IQueueTask;
  stateless: IQueueTask;
}

export interface IQueueTask {
  error: Error | null;
}

export interface IQueueError {
  error: Error;
}
