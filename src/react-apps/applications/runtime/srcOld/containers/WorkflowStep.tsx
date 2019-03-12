import * as React from 'react';
import { connect } from 'react-redux';
import { getLanguageFromKey } from '../../../shared/src/utils/language';
import FormFillerActionDispatchers from '../actions/formFillerActions/formFillerActionDispatcher';

export interface IWorkflowStepProvidedProps {
  header: string;
  step: WorkflowSteps;
  onStepChange: any;
}

/*
  Reflects enum at server side
*/
export enum WorkflowSteps {
  Unknown = 0,
  FormFilling = 1,
  Submit = 2,
  Archived = 3,
}

export interface IWorkflowStepProps extends IWorkflowStepProvidedProps {
  language: any;
  errorList: string[];
}

export interface IWorkflowStepState {
  workflowStep: WorkflowSteps;
}

class WorkflowStepComponent extends React.Component<IWorkflowStepProps, IWorkflowStepState> {
  constructor(props: IWorkflowStepProps, state: IWorkflowStepState) {
    super(props, state);
    this.state = {
      workflowStep: props.step,
    };
  }

  public renderTop = () => {
    return (
      <div className='row'>
        <div className='col-xl-12'>
          <div className='a-modal-top'>
            <img
              src='/designer/img/a-logo-blue.svg'
              alt='Altinn logo'
              className='a-logo a-modal-top-logo '
            />
            <div className='a-modal-top-user'>
              <div
                className='a-personSwitcher '
                title={getLanguageFromKey('form_filler.placeholder_user', this.props.language)}
              >
                <span className='a-personSwitcher-name'>
                  <span className='d-block' style={{ color: '#022F51' }}>
                    {getLanguageFromKey('form_filler.placeholder_user', this.props.language)}
                  </span>
                  <span className='d-block' />
                </span>
                <i
                  className='ai ai-private-circle-big  a-personSwitcher-icon'
                  aria-hidden='true'
                  style={{ color: '#022F51' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div >
    );
  }

  public renderHeader = () => {
    return (
      <div
        className={'modal-header a-modal-header ' +
          ((this.props.step === WorkflowSteps.Archived) ? 'a-modal-background-success' : '')
        }
      >
        <div className='a-iconText a-iconText-background a-iconText-large'>
          <div className='a-iconText-icon'>
            <i className='ai ai-corp a-icon' aria-hidden='true' />
          </div>
          <h1 className='a-iconText-text mb-0'>
            <span className='a-iconText-text-large'>{this.props.header}</span>
          </h1>
        </div>
      </div>
    );
  }

  public renderNavBar = () => {
    return (
      <div className='a-modal-navbar'>
        {this.props.step === WorkflowSteps.FormFilling &&
          <button type='button' className='a-modal-back a-js-tabable-popover' aria-label='Tilbake'>
            <span className='ai-stack'>
              <i className='ai ai-stack-1x ai-plain-circle-big' aria-hidden='true' />
              <i className='ai-stack-1x ai ai-back' aria-hidden='true' />
            </span>
          </button>
        }
        <button
          type='button'
          className='a-modal-close a-js-tabable-popover'
          aria-label='Lukk'
        >
          <span className='ai-stack'>
            <i className='ai ai-stack-1x ai-plain-circle-big' aria-hidden='true' />
            <i className='ai-stack-1x ai ai-exit  a-modal-close-icon' aria-hidden='true' />
          </span>
        </button>
      </div>
    );
  }

  public handleSubmitForm = () => {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service, instanceId } = altinnWindow;
    FormFillerActionDispatchers.completeAndSendInForm(
      `${window.location.origin}/runtime/${org}/${service}/${instanceId}/CompleteAndSendIn`);
  }
  public renderFormFiller = () => {
    return this.props.children;
  }

  public renderSubmit(): React.ReactNode {
    return (
      <button
        type='submit'
        className={'a-btn a-btn-success'}
        onClick={this.handleSubmitForm}
        id='workflowSubmitStepButton'
      >
        {getLanguageFromKey('general.submit', this.props.language)}
      </button>
    );
  }

  public renderReceipt = () => {
    return (
      <div id='receiptWrapper'>
        <p className='a-leadText'>
          {getLanguageFromKey('form_filler.placeholder_receipt_header', this.props.language)}
        </p>
      </div>
    );
  }

  public renderErrorReport = () => {
    if (!this.props.errorList || this.props.errorList.length === 0) {
      return null;
    }
    return (
      <div className='a-modal-content-target' style={{ marginTop: '55px' }}>
        <div className='a-page a-current-page'>
          <div className='modalPage'>
            <div className='modal-content'>
              <div
                className='modal-header a-modal-header'
                style={{
                  backgroundColor: '#F9CAD3',
                  color: 'black',
                  minHeight: '6rem',
                }}
              >
                <div>
                  <h3 className='a-fontReg' style={{ marginBottom: 0 }}>
                    <i className='ai ai-circle-exclamation a-icon' />
                    <span>{getLanguageFromKey('form_filler.error_report_header', this.props.language)}</span>
                  </h3>
                </div>
              </div>
              <div className='modal-body a-modal-body'>
                {this.props.errorList ?
                  this.props.errorList.map((error, index) => {
                    return (
                      <ol key={index}>
                        <li><a>{(index + 1).toString() + '. ' + error}</a></li>
                      </ol>
                    );
                  })
                  : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  public render() {
    const backgroundColor = (this.props.step === WorkflowSteps.Archived) ? '#D4F9E4' : '#1EAEF7';
    return (
      <div id='workflowContainer' style={{ backgroundColor, height: 'calc(100vh - 146px)' }} >
        <div className='container'>
          {this.renderTop()}
          <div className='row'>
            <div className='col-xl-10 offset-xl-1 a-p-static'>
              {this.renderErrorReport()}
              {this.renderNavBar()}
              <div className='a-modal-content-target'>
                <div className='a-page a-current-page'>
                  <div className='modalPage'>
                    <div className='modal-content'>
                      {this.renderHeader()}
                      <div className='modal-body a-modal-body'>
                        {this.props.step === WorkflowSteps.FormFilling &&
                          this.renderFormFiller()
                        }
                        {this.props.step === WorkflowSteps.Submit &&
                          this.renderSubmit()
                        }
                        {this.props.step === WorkflowSteps.Archived &&
                          this.renderReceipt()
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ div>
    );
  }
}

const getErrorList = (validations: IValidationResults) => {
  const unmappedValidations = validations.unmapped;
  if (!unmappedValidations) {
    return null;
  }

  return Object.keys(unmappedValidations).map((validationKey) => {
    return unmappedValidations[validationKey].errors.join(', ');
  });
};

const mapStateToProps = (state: IAppState, props: IWorkflowStepProvidedProps): IWorkflowStepProps => {
  return {
    language: state.appData.language.language,
    errorList: getErrorList(state.formFiller.validationResults),
    ...props,
  };
};

export const WorkflowStep = connect(mapStateToProps)(WorkflowStepComponent);
