import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../store';

import * as DataTaskQueueActions from './dataTask/dataTaskQueueActions';

export interface IQueueActions extends ActionCreatorsMapObject {
  startInitialDataTaskQueue: () => Action;
  startInitialDataTaskQueueFulfilled: () => Action;
}

const actions: IQueueActions = {
  startInitialDataTaskQueue: DataTaskQueueActions.startInitialDataTaskQueue,
  startInitialDataTaskQueueFulfilled: DataTaskQueueActions.startInitialDataTaskQueueFulfilled,
};

const QueueActions: IQueueActions = bindActionCreators<any, any>(actions, store.dispatch);

export default QueueActions;
