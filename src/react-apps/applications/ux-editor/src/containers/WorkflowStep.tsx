import * as React from 'react';
import { connect } from 'react-redux';

export interface IWorkflowStepProvidedProps {
  header: string;
}

export interface IWorkflowStepProps extends IWorkflowStepProvidedProps {
  language: any;
}

export interface IWorkflowStepState {}

class WorkflowStepComponent extends React.Component<IWorkflowStepProps, any> {

  public renderTop = () => {
    return (
      <div className='row'>
          <div className='col-xl-12'>
            <div className='a-modal-top'>
              <img
                src='/designer/img/Designsystem/v1/a-logo-blue.svg'
                alt='Altinn logo'
                className='a-logo a-modal-top-logo '
              />
              <div className='a-modal-top-user'>
                <div className='a-personSwitcher ' title={this.props.language.ux_editor.formfiller_placeholder_user}>
                  <span className='a-personSwitcher-name'>
                    <span className='d-block' style={{color: '#022F51'}}>
                      {this.props.language.ux_editor.formfiller_placeholder_user}
                    </span>
                    <span className='d-block'/>
                  </span>
                  <i
                    className='ai ai-private-circle-big  a-personSwitcher-icon'
                    aria-hidden='true'
                    style={{color: '#022F51'}}
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
      <div className='modal-header a-modal-header'>
        <div className='a-iconText a-iconText-background a-iconText-large'>
          <div className='a-iconText-icon'>
            <i className='ai ai-corp a-icon' aria-hidden='true'/>
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
        <button type='button' className='a-modal-back a-js-tabable-popover'aria-label='Tilbake'>
          <span className='ai-stack'>
            <i className='ai ai-stack-1x ai-plain-circle-big' aria-hidden='true'/>
            <i className='ai-stack-1x ai ai-back' aria-hidden='true'/>
          </span>
        </button>
        <button type='button' className='a-modal-close a-js-tabable-popover' aria-label='Lukk'>
          <span className='ai-stack'>
            <i className='ai ai-stack-1x ai-plain-circle-big' aria-hidden='true'/>
            <i className='ai-stack-1x ai ai-exit  a-modal-close-icon' aria-hidden='true'/>
          </span>
        </button>
      </div>
    );
  }

  public render() {
    return(
      <div className='container'>
        {this.renderTop()}
        <div className='row'>
          <div className='col-xl-10 offset-xl-1 a-p-static'>
            {this.renderNavBar()}
            <div className='a-modal-content-target'>
              <div className='a-page a-current-page'>
                <div className='modalPage'>
                  <div className='modal-content'>
                    {this.renderHeader()}
                    <div className='modal-body a-modal-body'>
                      {this.props.children}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state: IAppState, props: IWorkflowStepProvidedProps): IWorkflowStepProps => {
  return {
    header: props.header,
    language: state.appData.language.language,
  };
};

export const WorkflowStep = connect(mapStateToProps)(WorkflowStepComponent);
