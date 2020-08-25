import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../redux/store';
import * as DataTaskQueueActions from './dataTask/dataTaskQueueActions';
import * as AppTaskQueueActions from './appTask/appTaskQueueActions';

export interface IQueueError extends Action {
  error: any;
}

export interface IQueueActions extends ActionCreatorsMapObject {
  startInitialDataTaskQueue: () => Action;
  startInitialDataTaskQueueFulfilled: () => Action;
  dataTaskQueueError: (error: any) => IQueueError;
  startInitialAppTaskQueue: () => Action;
  startInitialAppTaskQueueFulfilled: () => Action;
  appTaskQueueError: (error: any) => IQueueError;
}

const actions: IQueueActions = {
  startInitialDataTaskQueue: DataTaskQueueActions.startInitialDataTaskQueue,
  startInitialDataTaskQueueFulfilled: DataTaskQueueActions.startInitialDataTaskQueueFulfilled,
  dataTaskQueueError: DataTaskQueueActions.dataTaskQueueError,
  startInitialAppTaskQueue: AppTaskQueueActions.startInitialAppTaskQueue,
  startInitialAppTaskQueueFulfilled: AppTaskQueueActions.startInitialAppTaskQueueFulfilled,
  appTaskQueueError: AppTaskQueueActions.appTaskQueueError,
};

const QueueActions: IQueueActions = bindActionCreators<any, any>(actions, store.dispatch);

export default QueueActions;
