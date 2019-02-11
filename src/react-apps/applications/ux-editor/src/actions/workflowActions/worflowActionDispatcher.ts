import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { WorkflowSteps } from '../../containers/WorkflowStep';
import { store } from '../../store';
import * as WorkflowActions from './actions';

export interface IWorkflowActionDispatcher extends ActionCreatorsMapObject {
  getCurrentState: (location: string) => WorkflowActions.IGetCurrentState;
  getCurrentStateFulfilled: (components: any) => WorkflowActions.IGetCurrentStateFulfilled;
  getCurrentStateRejected: (error: Error) => WorkflowActions.IGetCurrentStateRejected;
  setCurrentState: (state: WorkflowSteps) => WorkflowActions.ISetCurrentState;
}

const actions: IWorkflowActionDispatcher = {
  getCurrentState: WorkflowActions.getCurrentState,
  getCurrentStateFulfilled: WorkflowActions.getCurrentStateFulfilled,
  getCurrentStateRejected: WorkflowActions.getCurrentStateRejected,
  setCurrentState: WorkflowActions.setCurrentState,
};

const WorkflowActionDispatcher: IWorkflowActionDispatcher = bindActionCreators<
  any,
  IWorkflowActionDispatcher
>(actions, store.dispatch);

export default WorkflowActionDispatcher;
