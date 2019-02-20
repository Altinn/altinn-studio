import * as React from 'react';
import { connect } from 'react-redux';
import ApiActionDispatcher from '../actions/apiActions/apiActionDispatcher';
import AppConfigActionDispatcher from '../actions/appDataActions/appDataActionDispatcher';
import ConditionalRenderingActionDispatcher from '../actions/conditionalRenderingActions/conditionalRenderingActionDispatcher';
import FormFillerActionDispatchers from '../actions/formFillerActions/formFillerActionDispatcher';
import { makeGetDataModelSelector, makeGetDesignModeSelector } from '../selectors/getAppData';
import { makeGetFormDataCountSelector, makeGetUnsavedChangesSelector, makeGetValidationErrorsSelector } from '../selectors/getFormData';
import { makeGetApiConnectionsSelector } from '../selectors/getServiceConfigurations';
import { getTextResource } from '../utils/language';
import { Preview } from './Preview';
import { WorkflowStep, WorkflowSteps } from './WorkflowStep';

export interface IFormFillerProps {
  validationErrors: any[];
  unsavedChanges: boolean;
  connections: any;
  dataModelElements: IDataModelFieldElement[];
  designMode: boolean;
  formDataCount: number;
  language: any;
  workflowStep: WorkflowSteps;
  textResources: any[];
}

export interface IFormFillerState {
  workflowStep: WorkflowSteps;
}

/**
 * Component responsible for rendering the layout around the
 * form itself.
 */
export class FormFillerComponent extends React.Component<IFormFillerProps, IFormFillerState> {

  public static getDerivedStateFromProps(props: IFormFillerProps, state: IFormFillerState): IFormFillerState {
    if (props.workflowStep !== state.workflowStep) {
      return {
        workflowStep: props.workflowStep,
      };
    } else {
      return null;
    }
  }

  constructor(props: IFormFillerProps, state: IFormFillerState) {
    super(props, state);
    this.state = {
      workflowStep: props.workflowStep,
    };
  }

  public componentDidMount() {
    AppConfigActionDispatcher.setDesignMode(false);
    ConditionalRenderingActionDispatcher.checkIfConditionalRulesShouldRun();
  }

  public componentDidUpdate(prevProps: IFormFillerProps) {
    if (this.props.connections && this.props.dataModelElements && this.props.dataModelElements.length > 0) {
      ApiActionDispatcher.fetchApiListResponse();
    }
  }

  public saveFormData = () => {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { reportee, org, service, instanceId } = altinnWindow;
    FormFillerActionDispatchers.submitFormData(`
        ${window.location.origin}/runtime/api/${reportee}/${org}/${service}/${instanceId}`);
  }

  public submitForm = () => {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { reportee, org, service, instanceId } = altinnWindow;
    FormFillerActionDispatchers.submitFormData(`
      ${window.location.origin}/runtime/api/${reportee}/${org}/${service}/${instanceId}`, 'Complete');
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
    const disabled = (this.props.formDataCount > 0 && Object.keys(this.props.validationErrors).length !== 0)
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

const makeMapStateToProps = () => {
  const GetFormDataCount = makeGetFormDataCountSelector();
  const GetDesignMode = makeGetDesignModeSelector();
  const GetDataModel = makeGetDataModelSelector();
  const GetApiConnections = makeGetApiConnectionsSelector();
  const GetUnsavedChanges = makeGetUnsavedChangesSelector();
  const GetValidationErrors = makeGetValidationErrorsSelector();
  const mapStateToProps = (state: IAppState, empty: any): IFormFillerProps => {
    return {
      validationErrors: GetValidationErrors(state),
      unsavedChanges: GetUnsavedChanges(state),
      connections: GetApiConnections(state),
      dataModelElements: GetDataModel(state),
      designMode: GetDesignMode(state),
      formDataCount: GetFormDataCount(state),
      language: state.appData.language.language,
      workflowStep: state.workflow.workflowStep,
      textResources: state.appData.textResources.resources,
    };
  };
  return mapStateToProps;
};

export const FormFiller = connect(makeMapStateToProps)(FormFillerComponent);
