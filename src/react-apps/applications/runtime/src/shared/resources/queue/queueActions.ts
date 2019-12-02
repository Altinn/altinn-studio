import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../store';

import * as DataTaskQueueActions from './dataTask/dataTaskQueueActions';

export interface IQueueActions extends ActionCreatorsMapObject {
  startInitialDataTaskQueue: () => DataTaskQueueActions.IDataTaskQueue;
}

const actions: IQueueActions = {
  startInitialDataTaskQueue: DataTaskQueueActions.startInitialDataTaskQueue,
};

const QueueActions: IQueueActions = bindActionCreators<any, any>(actions, store.dispatch);

export default QueueActions;
