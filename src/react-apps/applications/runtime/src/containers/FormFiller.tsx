import * as React from 'react';
import { connect } from 'react-redux';
import { getLanguageFromKey } from '../../../shared/src/utils/language';
import { WorkflowSteps } from '../features/form/workflow/typings';
import { IRuntimeState } from '../types';
import Render from './Render';
import { WorkflowStep } from './WorkflowStep';

export interface IFormFillerProps {
  formConfig: any;
  textResources: any[];
  workflowStep: WorkflowSteps;
}

const FormFiller = (props: IFormFillerProps) => {
  const [workflowStep, setWorkflowStep] = React.useState(props.workflowStep);

  React.useEffect(() => {
    setWorkflowStep(props.workflowStep);
  }, [props]);

  return (
    <WorkflowStep
      header={props.formConfig.serviceName ? props.formConfig.serviceName :
        getLanguageFromKey('general.ServiceName', props.textResources)}
      step={workflowStep}
    >
      <div className='row'>
        <Render />
      </div>
    </WorkflowStep>
  );
};

const mapStateToProps = (state: IRuntimeState): IFormFillerProps => {
  return {
    formConfig: state.formConfig,
    textResources: state.language.language,
    workflowStep: state.formWorkflow.state,
  };
};

export default connect(mapStateToProps)(FormFiller);
