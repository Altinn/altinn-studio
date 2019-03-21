import * as React from 'react';
import { connect } from 'react-redux';
import { WorkflowSteps } from '../features/form/workflow/typings';
import FormDataActions from '../features/form/data/actions';

export interface IFormFillerProps {
  workflowStep: WorkflowSteps;
  unsavedChanges: boolean;
  language: any;
  textResources: any;
  validationResults: any;
  formDataCount: number;
}

export interface IFormFillerState {
  workflowStep: WorkflowSteps;
}

const getTextResource = (...params: any) => 'header';

const WorkflowStep = ({ header, step, onStepChange, children }) => {
  class Step extends React.Component<any, any> {
    render() {
      return (
        <div onClick={() => onStepChange('what')}>
          {header}
          {step}
          {children}
        </div>
      )
    }
  }
  return Step;
}

class FormFillerComponent extends React.Component<IFormFillerProps, IFormFillerState> {
  public static getDerivedStateFromProps(props: IFormFillerProps, state: IFormFillerState): IFormFillerState {
    if (props.workflowStep !== state.workflowStep) {
      return {
        workflowStep: props.workflowStep,
      };
    } else {
      return null;
    }
  }

  constructor(props: IFormFillerProps) {
    super(props);
    this.state = {
      workflowStep: props.workflowStep,
    };
  }

  public componentDidMount() {
    // ConditionalRenderingActionDispatcher.checkIfConditionalRulesShouldRun();
  }

  public componentDidUpdate(prevProps: IFormFillerProps) {
    // if (this.props.connections && this.props.dataModelElements && this.props.dataModelElements.length > 0) {
    //   ApiActionDispatcher.fetchApiListResponse();
    // }
  }

  public saveFormData = () => {
    // Todo: create global typings for altinn window
    const altinnWindow: any = window as any;
    const { reportee, org, service, instanceId } = altinnWindow;
    FormDataActions.submitFormData(`
      ${window.location.origin}/runtime/api/${reportee}/${org}/${service}/${instanceId}`
    );
  }

  public submitForm = () => {
    // Todo: create global typings for altinn window
    const altinnWindow: any = window as any;
    const { reportee, org, service, instanceId } = altinnWindow;
    FormDataActions.submitFormData(`
      ${window.location.origin}/runtime/api/${reportee}/${org}/${service}/${instanceId}`,
      'Complete',
    );
  }

  public renderSaveButton = () => {
    const disabled = !this.props.unsavedChanges;
    return (
      <button
        type='submit'
        className={disabled ?
          'a-btn a-btn-success disabled' : 'a-btn a-btn-success'}
        onClick={this.saveFormData}
        disabled={disabled}
      >
        {this.props.language.general.save}
      </button>
    );
  }

  public handleStepChange = (step: WorkflowSteps) => {
    this.setState({
      workflowStep: step,
    });
  }

  public renderSubmitButton = () => {
    const disabled = (this.props.formDataCount > 0 &&
      (this.props.validationResults !== null && Object.keys(this.props.validationResults).length !== 0))
      || this.props.unsavedChanges || this.props.formDataCount === 0;
    return (
      <button
        type='submit'
        className={disabled ? 'a-btn a-btn-success disabled' : 'a-btn a-btn-success'}
        onClick={this.submitForm}
        disabled={disabled}
      >
        {this.props.language.general.control_submit}
      </button>
    );
  }

  public render() {
    return (
      <WorkflowStep
        header={getTextResource('ServiceName', this.props.textResources)}
        step={this.state.workflowStep}
        onStepChange={this.handleStepChange}
      >
        <div className='row'>
          <Preview />
        </div>
        <div className='row mt-3'>
          <div className='a-btn-group'>
            {this.renderSaveButton()}
            {this.renderSubmitButton()}
          </div>
        </div>
      </WorkflowStep>
    );
  }
}