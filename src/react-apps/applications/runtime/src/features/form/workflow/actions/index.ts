import {
  Action,
  ActionCreatorsMapObject,
  bindActionCreators,
} from 'redux';
import { store } from '../../../../store';
import { WorkflowSteps } from '../typings';

import * as WorkflowStateActions from './workflowState';

export interface IFormWorkflowActions extends ActionCreatorsMapObject {
  getCurrentState: (url: string) => WorkflowStateActions.IGetCurrentState;
  getCurrentStateFulfilled: (state: WorkflowSteps) => WorkflowStateActions.IGetCurrentStateFulfilled;
  getCurrentStateRejected: (error: Error) => WorkflowStateActions.IGetCurrentStateRejected;
  setCurrentState: (state: WorkflowSteps) => WorkflowStateActions.ISetCurrentState;
  setCurrentStateFulfilled: () => Action;
  setCurrentStateRejected: (error: Error) => WorkflowStateActions.ISetCurrentStateRejected;
}

const actions: IFormWorkflowActions = {
  getCurrentState: WorkflowStateActions.getCurrentState,
  getCurrentStateFulfilled: WorkflowStateActions.getCurrentStateFulfilled,
  getCurrentStateRejected: WorkflowStateActions.getCurrentStateRejected,
  setCurrentState: WorkflowStateActions.setCurrentState,
  setCurrentStateFulfilled: WorkflowStateActions.setCurrentStateFulfilled,
  setCurrentStateRejected: WorkflowStateActions.setCurrentStateRejected,
};

const WorkflowActions: IFormWorkflowActions = bindActionCreators<any, any>(actions, store.dispatch);

export default WorkflowActions;
