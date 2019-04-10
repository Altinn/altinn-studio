import * as React from 'react';
import { connect } from 'react-redux';
import { getLanguageFromKey } from '../../../shared/src/utils/language';
import FormDataActions from '../features/form/data/actions';
import { WorkflowSteps } from '../features/form/workflow/typings';
import { WorkflowStep } from './WorkflowStep';
import { IRuntimeState } from '../reducers';
import { Preview } from './Preview';
export interface IFormFillerProps {
  formDataCount: number;
  textResources: any[];
  unsavedChanges: boolean;
  validationResults: any;
  workflowStep: WorkflowSteps;
}
const FormFillerComponent = (props: IFormFillerProps) => {
  const [workflowStep, setWorkFlowStep] = React.useState(props.workflowStep);

  React.useEffect(() => {
    setWorkFlowStep(props.workflowStep);
  }, [props]);

  const handleStepChange = (step: WorkflowSteps) => {
    setWorkFlowStep(step);
  };

  const saveFormData = () => {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { reportee, org, service, instanceId } = altinnWindow;
    FormDataActions.submitFormData(`
        ${window.location.origin}/runtime/api/${reportee}/${org}/${service}/${instanceId}`);
  };

  const submitForm = () => {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { reportee, org, service, instanceId } = altinnWindow;
    FormDataActions.submitFormData(`
      ${window.location.origin}/runtime/api/${reportee}/${org}/${service}/${instanceId}`, 'Complete');
  };

  const renderSaveButton = () => {
    const disabled = !props.unsavedChanges;
    return (
      <button
        type='submit'
        className={disabled ?
          'a-btn a-btn-success disabled' : 'a-btn a-btn-success'}
        onClick={saveFormData}
        disabled={disabled}
      >
        {getLanguageFromKey('general.save', props.textResources)}
      </button>
    );
  };
  const renderSubmitButton = () => {
    const disabled = (props.formDataCount > 0 &&
      (props.validationResults !== null && Object.keys(props.validationResults).length !== 0))
      || props.unsavedChanges || props.formDataCount === 0;
    return (
      <button
        type='submit'
        className={disabled ? 'a-btn a-btn-success disabled' : 'a-btn a-btn-success'}
        onClick={submitForm}
        disabled={disabled}
      >
        {getLanguageFromKey('general.control_submit', props.textResources)}
      </button>
    );
  };

  return (
    <WorkflowStep
      header={getLanguageFromKey('general.ServiceName', props.textResources)}
      step={workflowStep}
      onStepChange={handleStepChange}
    >
      <div className='row'>
        <Preview />
      </div>
      <div className='row mt-3'>
        <div className='a-btn-group'>
          {props.textResources && renderSaveButton()}
          {props.textResources && renderSubmitButton()}
        </div>
      </div>
    </WorkflowStep>
  );
};

const mapStateToProps = (state: IRuntimeState): IFormFillerProps => {
  return {
    formDataCount: 1,
    textResources: state.language.language,
    unsavedChanges: false,
    validationResults: null,
    workflowStep: state.formWorkflow.state,
  };
};

export const FormFiller = connect(mapStateToProps)(FormFillerComponent);
