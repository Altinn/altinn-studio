import * as React from 'react';
import { connect } from 'react-redux';
import ApiActionDispatcher from '../actions/apiActions/apiActionDispatcher';
import AppConfigActionDispatcher from '../actions/appDataActions/appDataActionDispatcher';
import ConditionalRenderingActionDispatcher from '../actions/conditionalRenderingActions/conditionalRenderingActionDispatcher';
import FormFillerActionDispatchers from '../actions/formFillerActions/formFillerActionDispatcher';
import { makeGetDataModelSelector, makeGetDesignModeSelector } from '../selectors/getAppData';
import { makeGetFormDataCountSelector, makeGetUnsavedChangesSelector, makeGetValidationErrorsSelector } from '../selectors/getFormData';
import { makeGetApiConnectionsSelector } from '../selectors/getServiceConfigurations';
import { Preview } from './Preview';

export interface IFormFillerProps {
  validationErrors: any[];
  unsavedChanges: boolean;
  connections: any;
  dataModelElements: IDataModelFieldElement[];
  designMode: boolean;
  formDataCount: number;
  language: any;
}

export interface IFormFillerState { }

/**
 * Component responsible for rendering the layout around the
 * form itself.
 */
export class FormFillerComponent extends React.Component<IFormFillerProps, IFormFillerState> {

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
    if (window.location.pathname.split('/')[1].toLowerCase() === 'runtime') {
      FormFillerActionDispatchers.submitFormData(`
        ${window.location.origin}/runtime/api/${reportee}/${org}/${service}/${instanceId}`);
    }
  }

  public submitForm = () => {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service, instanceId } = altinnWindow;
    if (window.location.pathname.split('/')[1].toLowerCase() === 'runtime') {
      window.location.replace(`${window.location.origin}/runtime/` +
        `${org}/${service}/${instanceId}/CompleteAndSendIn`);
    }
  }

  public renderSaveButton = () => {
    return (
      <button
        type='submit'
        className={Object.keys(this.props.validationErrors).length === 0 && this.props.unsavedChanges ?
          'a-btn a-btn-success' : 'a-btn a-btn-success disabled'}
        onClick={this.saveFormData}
      >
        {this.props.language.general.save}
      </button>
    );
  }

  public renderSubmitButton = () => {
    return (
      <button
        type='submit'
        className={Object.keys(this.props.validationErrors).length === 0 && !this.props.unsavedChanges
          && this.props.formDataCount > 0 ?
          'a-btn a-btn-success' : 'a-btn a-btn-success disabled'}
        onClick={this.submitForm}
      >
        {this.props.language.general.control_submit}
      </button>
    );
  }

  public render() {
    // return (
    //   <div className='container a-bgWhite pr-3 pl-3 flex-column media-body'>
    //     <div className='row pt-3'>
    //       <Preview />
    //     </div>
        
    //   </div>
    // );
  // }

  return (
    <div className={'container a-bgBlue'}>
      <div className="row">
          <div className="col-xl-12">
            <div className="a-modal-top">
              <img src="/designer/img/Designsystem/v1/a-logo-blue.svg" alt="Altinn logo" className="a-logo a-modal-top-logo "/>
              <div className="a-modal-top-user">
                <div className="a-personSwitcher " title="JAN PETTERSEN ">
                  <span className="a-personSwitcher-name">
    <span className="d-block" style={{color: '#022F51'}}>OLA NORMANN</span>
                  <span className="d-block"></span>
                  </span>
                  <i className="ai ai-private-circle-big  a-personSwitcher-icon " aria-hidden="true" style={{color: '#022F51'}}></i>
                </div>

              </div>
            </div>

          </div>
        </div>
        <div className="row">
          <div className="col-xl-10 offset-xl-1 a-p-static">
            <div className="a-modal-navbar">
              <button type="button" className="a-modal-back a-js-tabable-popover"aria-label="Tilbake">
                <span className="ai-stack">
                  <i className="ai ai-stack-1x ai-plain-circle-big" aria-hidden="true"></i>
                  <i className="ai-stack-1x ai ai-back   " aria-hidden="true"></i>
                </span>
              </button>
              <button type="button" className="a-modal-close a-js-tabable-popover" aria-label="Lukk">
                <span className="ai-stack">
                  <i className="ai ai-stack-1x ai-plain-circle-big" aria-hidden="true"></i>
                  <i className="ai-stack-1x ai ai-exit  a-modal-close-icon " aria-hidden="true"></i>
                </span>
              </button>
            </div>

            <div className="a-modal-content-target">
              <div className="a-page a-current-page">
                <div className="modalPage">
                  <div className="modal-content">
                    <div className="modal-header a-modal-header">
                      <div className="a-iconText a-iconText-background a-iconText-large ">
                        <div className="a-iconText-icon ">
                          <i className="ai ai-corp a-icon " aria-hidden="true"></i>
                        </div>
                        <h1 className="a-iconText-text mb-0">
                          <span className="a-iconText-text-large">Test123  </span>
                        </h1>
                      </div>
                    </div>

                    <div className="modal-body a-modal-body">
                      <div className="row">
                        <div className="col-8">
                          <Preview />
                        </div>
                        <div className="col pt-1 d-none d-md-block">
                        </div>
                      </div>
                      <div className='row mt-3'>
                        <div className='a-btn-group'>
                          {this.renderSaveButton()}
                          {this.renderSubmitButton()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              <span className="onboarding-wrapper" style={{display: 'none', transform: 'translate3d(0px, 0px, 0px) matrix(1, 0, 0, 1, 570, 700)'}}>
                <span className="a-js-circle"></span>
              </span>
              <span className="onboarding-neutral" style={{display: 'none'}}></span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
    };
  };
  return mapStateToProps;
};

export const FormFiller = connect(makeMapStateToProps)(FormFillerComponent);
