import { WorkflowSteps } from '../../containers/WorkflowStep';
import workflowReducer from './workflowReducer';

export interface IWorkflowState {
  workflowStep: WorkflowSteps;
}

export default workflowReducer;
