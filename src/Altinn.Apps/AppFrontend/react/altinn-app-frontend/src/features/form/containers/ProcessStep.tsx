import { Typography } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import classNames from 'classnames';
import * as React from 'react';
import { connect } from 'react-redux';
import {AltinnAppHeader} from 'altinn-shared/components';
import {AltinnAppTheme} from 'altinn-shared/theme';
import { IParty } from 'altinn-shared/types';
import { getLanguageFromKey, returnUrlToMessagebox } from 'altinn-shared/utils';
import { IAltinnWindow, IRuntimeState, ProcessSteps } from '../../../types';
import { IValidations } from '../../../types/global';
import ReceiptContainer from '../../receipt/containers/receiptContainer';
import FormFillerActions from '../data/formDataActions';

export interface IProcessStepProvidedProps {
  header: string;
  step: ProcessSteps;
}

export interface IProcessStepProps extends IProcessStepProvidedProps {
  party: IParty;
  language: any;
  formHasErrors: boolean;
  userParty: IParty;
}

export interface IProcessStepState {
  processStep: ProcessSteps;
}

class ProcessStepComponent extends React.Component<IProcessStepProps, IProcessStepState> {
  constructor(props: IProcessStepProps, state: IProcessStepState) {
    super(props, state);
    this.state = {
      processStep: props.step,
    };
  }

  public renderHeader = () => {
    return (
      <div
        className={classNames(
          'modal-header',
          'a-modal-header',
          {['a-modal-background-success']: this.props.step === ProcessSteps.Archived},
        )}
      >
        <div className='a-iconText a-iconText-background a-iconText-large'>
          <div className='a-iconText-icon'>
            <i className='fa fa-corp a-icon' aria-hidden='true' />
          </div>
          <h1 className='a-iconText-text mb-0'>
            <span className='a-iconText-text-large'>{this.props.step === ProcessSteps.Archived ? (
              <span>{getLanguageFromKey('receipt.receipt', this.props.language)}</span>
            ) : (this.props.header)}</span>
          </h1>
        </div>
      </div>
    );
  }

  public handleModalCloseButton = () => {
    const origin = window.location.origin;
    if (window) {
      window.location.href = returnUrlToMessagebox(origin);
    }
    return true;
  }

  public renderNavBar = () => {
    return (
      <div className='a-modal-navbar'>
        {/* Hide this button for the time being, ref. issue https://github.com/altinn/altinn-studio/issues/2500 */}
        {/* {this.props.step === ProcessSteps.FormFilling &&
          <button
            type='button'
            className='a-modal-back a-js-tabable-popover'
            aria-label={getLanguageFromKey('general.back', this.props.language)}
          >
            <span className='ai-stack'>
              <i className='ai ai-stack-1x ai-plain-circle-big' aria-hidden='true' />
              <i className='ai-stack-1x ai ai-back' aria-hidden='true' />
            </span>
            <span className='hidden-button-text'>
              {getLanguageFromKey('general.back', this.props.language)}
            </span>
          </button>
        } */}
        <button
          type='button'
          className='a-modal-close a-js-tabable-popover'
          aria-label={getLanguageFromKey('general.close', this.props.language)}
          onClick={this.handleModalCloseButton}
        >
          <span className='ai-stack'>
            <i className='ai ai-stack-1x ai-plain-circle-big' aria-hidden='true' />
            <i className='ai-stack-1x ai ai-exit  a-modal-close-icon' aria-hidden='true' />
          </span>
          <span className='hidden-button-text'>
            {getLanguageFromKey('general.close', this.props.language)}
          </span>
        </button>
      </div>
    );
  }

  public handleSubmitForm = () => {
    const { org, app, instanceId } = window as Window as IAltinnWindow;
    FormFillerActions.completeAndSendInForm(
      `${window.location.origin}/${org}/${app}/${instanceId}/CompleteAndSendIn`);
  }
  public renderFormFiller = () => {
    return this.props.children;
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
    if (!this.props.formHasErrors) {
      return null;
    }

    return (
      <div id='errorReport' className='a-modal-content-target' style={{ marginTop: '55px' }}>
        <div className='a-page a-current-page'>
          <div className='modalPage'>
            <div className='modal-content'>
              <div className='modal-body' style={{paddingBottom: '0px'}}>
                <div className='a-iconText' style={{minHeight: '60px'}}>
                  <div className='a-iconText-icon'>
                    <i
                      className='ai ai-circle-exclamation a-icon'
                      style={{
                        color: '#E23B53',
                        fontSize: '4em',
                        marginLeft: '12px',
                      }}
                      aria-hidden='true'
                    />
                  </div>
                    <h2 className='a-fontReg' style={{marginBottom: '0px', marginLeft: '12px'}}>
                      <span className='a-iconText-text-large'>
                        {getLanguageFromKey('form_filler.error_report_header', this.props.language)}
                      </span>
                    </h2>
                </div>
              </div>
              <div className='modal-body a-modal-body' style={{paddingTop: '0px', paddingBottom: '24px'}}>
                <h4 className='a-fontReg'>
                  <span>
                  {getLanguageFromKey('form_filler.error_report_description', this.props.language)}
                  </span>
                </h4>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  public render() {
    const isProcessStepsArchived = Boolean(this.props.step === ProcessSteps.Archived);
    let backgroundColor: string;

    if (isProcessStepsArchived) {
      document.body.style.background = AltinnAppTheme.altinnPalette.primary.greenLight;
      backgroundColor = AltinnAppTheme.altinnPalette.primary.greenLight;
    } else {
      document.body.style.background = AltinnAppTheme.altinnPalette.primary.blue;
      backgroundColor = AltinnAppTheme.altinnPalette.primary.blue;
    }

    return (
      <div id='processContainer' style={{ marginBottom: '1rem' }}>
          <AltinnAppHeader
            party={this.props.party}
            userParty={this.props.userParty}
            logoColor={AltinnAppTheme.altinnPalette.primary.blueDarker}
            headerBackgroundColor={backgroundColor}
          />
          <div className='container'>
            <div className={classNames('row', {['d-print-none']: isProcessStepsArchived})}>
              <div className='col-xl-10 offset-xl-1 a-p-static'>
                {this.renderErrorReport()}
                {this.renderNavBar()}
                <div className='a-modal-content-target'>
                  <div className='a-page a-current-page'>
                    <div className='modalPage'>
                      <div className='modal-content'>
                        {this.renderHeader()}
                        <div className='modal-body a-modal-body'>
                          {this.props.step === ProcessSteps.FormFilling &&
                            this.renderFormFiller()
                          }
                          {this.props.step === ProcessSteps.Archived &&
                            <div id='ReceiptContainer'>
                              <ReceiptContainer/>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {this.props.step === ProcessSteps.Archived &&
              <Box display='none' displayPrint='block'>
                <Typography variant='h2' style={{marginBottom: '2.1rem'}}>
                  {getLanguageFromKey('receipt.receipt', this.props.language)}
                </Typography>
                <ReceiptContainer />
              </Box>
            }
        </div>
      </div>
    );
  }
}

const getFormHasErrors = (validations: IValidations): boolean => {
  let hasErrors = false;
  for (const key in validations) {
    if (validations.hasOwnProperty(key)) {
      const validationObject = validations[key];
      for (const fieldKey in validationObject) {
        if (validationObject.hasOwnProperty(fieldKey)) {
          const fieldValidationErrors = validationObject[fieldKey].errors;
          if (fieldValidationErrors && fieldValidationErrors.length > 0) {
            hasErrors = true;
            break;
          }
        }
      }
      if (hasErrors) {
        break;
      }
    }
  }
  return hasErrors;
};

const mapStateToProps = (state: IRuntimeState, props: IProcessStepProvidedProps): IProcessStepProps => {
  return {
    userParty: state.profile.profile ? state.profile.profile.party : {} as IParty,
    language: state.language ? state.language.language : {},
    formHasErrors: getFormHasErrors(state.formValidations.validations),
    party: state.party ? state.party.selectedParty : {} as IParty,
    ...props,
  };
};

export const ProcessStep = connect(mapStateToProps)(ProcessStepComponent);
