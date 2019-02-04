import * as React from 'react';
import { connect } from 'react-redux';
import { Redirect } from 'react-router';

export interface IWorkflowStepProvidedProps {
  header: string;
  step: string;
}

export enum WorkflowSteps {
  FormFilling = 'formfilling',
  Archived = 'archived',
  Submit = 'submit',
}

export interface IWorkflowStepProps extends IWorkflowStepProvidedProps {
  language: any;
}

export interface IWorkflowStepState {
  redirect: boolean;
  isRuntime: boolean;
}

class WorkflowStepComponent extends React.Component<IWorkflowStepProps, IWorkflowStepState> {
  constructor(props: IWorkflowStepProps, state: IWorkflowStepState) {
    super(props, state);
    const isRuntime = window.location.pathname.split('/')[1].toLowerCase() === 'runtime';
    this.state = {
      redirect: false,
      isRuntime,
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
              <div className='a-personSwitcher ' title={this.props.language.ux_editor.formfiller_placeholder_user}>
                <span className='a-personSwitcher-name'>
                  <span className='d-block' style={{ color: '#022F51' }}>
                    {this.props.language.ux_editor.formfiller_placeholder_user}
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
      </div>
    );
  }

  public renderHeader = () => {
    return (
      <div
        className={'modal-header a-modal-header ' +
          ((this.props.step === 'archived') ? 'a-modal-background-success' : '')
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
        {this.props.step === 'formfiller' &&
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
          onClick={this.handleClose}
        >
          <span className='ai-stack'>
            <i className='ai ai-stack-1x ai-plain-circle-big' aria-hidden='true' />
            <i className='ai-stack-1x ai ai-exit  a-modal-close-icon' aria-hidden='true' />
          </span>
        </button>
      </div>
    );
  }

  public handleClose = () => {
    this.setState({
      redirect: true,
    });
  }

  public renderFormFiller = () => {
    return this.props.children;
  }

  public renderSubmit(): React.ReactNode {
    return (
      <></>
    );
  }

  public renderReceipt = () => {
    // Just renders a placeholder receipt for now
    return (
      <p className='a-leadText'>{this.props.language.ux_editor.formfiller_placeholder_receipt_header}</p>
    );
  }

  public render() {
    const backgroundColor = (this.props.step === 'archived') ? '#D4F9E4' : '#1EAEF7';
    if (!this.state.isRuntime && this.state.redirect) {
      return (
        <Redirect to={'/uieditor'} />
      );
    }
    return (
      <div style={{ backgroundColor, height: 'calc(100vh - 146px)' }} >
        <div className='container'>
          {this.renderTop()}
          <div className='row'>
            <div className='col-xl-10 offset-xl-1 a-p-static bg'>
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

const mapStateToProps = (state: IAppState, props: IWorkflowStepProvidedProps): IWorkflowStepProps => {
  return {
    language: state.appData.language.language,
    ...props,
  };
};

export const WorkflowStep = connect(mapStateToProps)(WorkflowStepComponent);
