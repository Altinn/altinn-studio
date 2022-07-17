export interface IQueueState {
  dataTask: IQueueTask;
  appTask: IQueueTask;
  userTask: IQueueTask;
  infoTask: IQueueTask;
  stateless: IQueueTask;
}

export interface IQueueTask {
  isDone: boolean;
  error: any;
}

export interface IQueueError {
  error: any;
}
