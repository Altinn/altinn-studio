import { Typography } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import classNames from 'classnames';
import * as React from 'react';
import { connect } from 'react-redux';
import AltinnAppHeader from '../../../../../shared/src/components/organisms/AltinnAppHeader';
import AltinnAppTheme from '../../../../../shared/src/theme/altinnAppTheme';
import { IParty } from '../../../../../shared/src/types';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import { returnUrlToMessagebox } from '../../../../../shared/src/utils/urlHelper';
import { IAltinnWindow, IRuntimeState, ProcessSteps } from '../../../types';
import { IValidations } from '../../../types/global';
import ReceiptContainer from '../../receipt/containers/receiptContainer';
import FormFillerActions from '../data/actions';

export interface IProcessStepProvidedProps {
  header: string;
  step: ProcessSteps;
}

export interface IProcessStepProps extends IProcessStepProvidedProps {
  party: IParty;
  language: any;
  errorList: string[];
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
                    <span>
                      {getLanguageFromKey('form_filler.error_report_header', this.props.language)}
                    </span>
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
    const isProcessStepsArchived = Boolean(this.props.step === ProcessSteps.Archived);
    const backgroundColor = isProcessStepsArchived ? '#D4F9E4' : '#1EAEF7';

    return (
      <div id='processContainer' style={{ backgroundColor, height: 'calc(100vh - 146px)' }} >
          <AltinnAppHeader
            party={this.props.party}
            userParty={this.props.userParty}
            logoColor={AltinnAppTheme.altinnPalette.primary.blueDarker}
            headerBackgroundColor={AltinnAppTheme.altinnPalette.primary.blue}
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

const getErrorList = (validations: IValidations) => {
  const unmappedValidations = validations.unmapped;
  if (!unmappedValidations) {
    return null;
  }

  return Object.keys(unmappedValidations).map((validationKey) => {
    return unmappedValidations[validationKey].errors.join(', ');
  });
};

const mapStateToProps = (state: IRuntimeState, props: IProcessStepProvidedProps): IProcessStepProps => {
  return {
    userParty: state.profile.profile ? state.profile.profile.party : {} as IParty,
    language: state.language ? state.language.language : {},
    errorList: getErrorList(state.formValidations ? state.formValidations.validations : {}),
    party: state.party ? state.party.selectedParty : {} as IParty,
    ...props,
  };
};

export const ProcessStep = connect(mapStateToProps)(ProcessStepComponent);
