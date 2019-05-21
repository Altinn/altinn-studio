import * as React from 'react';
import { connect } from 'react-redux';
import { getLanguageFromKey } from '../../../shared/src/utils/language';
import FormDataActions from '../features/form/data/actions';
import { WorkflowSteps } from '../features/form/workflow/typings';
import { IAltinnWindow, IRuntimeState } from '../types';
import { ITextResource, IValidations } from '../types/global';
import { getErrorCount } from '../utils/validation';
import Render from './Render';
import { WorkflowStep } from './WorkflowStep';

export interface IFormFillerProps {
  formConfig: any;
  textResources: ITextResource[];
  unsavedChanges: boolean;
  validationResults: IValidations;
  workflowStep: WorkflowSteps;
}

const FormFiller = (props: IFormFillerProps) => {
  const [workflowStep, setWorkflowStep] = React.useState(props.workflowStep);

  React.useEffect(() => {
    setWorkflowStep(props.workflowStep);
  }, [props]);

  const handleStepChange = (step: WorkflowSteps) => {
    setWorkflowStep(step);
  };

  const saveFormData = () => {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { reportee, org, service, instanceId } = altinnWindow;
    FormDataActions.submitFormData(
      `${window.location.origin}/runtime/api/${reportee}/${org}/${service}/${instanceId}`,
    );
  };

  const submitForm = () => {
    const { reportee, org, service, instanceId } = window as IAltinnWindow;
    FormDataActions.submitFormData(
      `${window.location.origin}/runtime/api/${reportee}/${org}/${service}/${instanceId}`,
      'Complete',
    );
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
    const validationErrors = getErrorCount(props.validationResults);
    const disabled = (validationErrors > 0) || props.unsavedChanges;
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
      header={props.formConfig.serviceName ? props.formConfig.serviceName :
        getLanguageFromKey('general.ServiceName', props.textResources)}
      step={workflowStep}
      onStepChange={handleStepChange}
    >
      <div className='row'>
        <Render />
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
    formConfig: state.formConfig,
    textResources: state.language.language.resource,
    unsavedChanges: state.formData.unsavedChanges,
    validationResults: state.formValidations.validations,
    workflowStep: state.formWorkflow.state,
  };
};

export default connect(mapStateToProps)(FormFiller);
