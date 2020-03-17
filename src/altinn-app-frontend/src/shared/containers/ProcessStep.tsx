import { Typography } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import classNames from 'classnames';
import * as React from 'react';
import { useSelector } from 'react-redux';
import {AltinnAppHeader} from 'altinn-shared/components';
import {AltinnAppTheme} from 'altinn-shared/theme';
import { IParty } from 'altinn-shared/types';
import { getLanguageFromKey, returnUrlToMessagebox } from 'altinn-shared/utils';
import { IRuntimeState, ProcessSteps } from '../../types';
import { IValidations, ITextResource } from '../../types/global';
import ReceiptContainer from '../../features/receipt/containers/receiptContainer';
import ErrorReport from '../../components/message/ErrorReport';
import Header from '../../components/process-step/Header';
import NavBar from '../../components/process-step/NavBar';

export interface IProcessStepProvidedProps {
  header: string;
  step: ProcessSteps;
}

const ProcessStepComponent = (props) => {
  const party: IParty = useSelector((state: IRuntimeState) => state.party ? state.party.selectedParty : {} as IParty);
  const language: any = useSelector((state: IRuntimeState) => state.language ? state.language.language : {});
  const formHasErrors: boolean = useSelector((state: IRuntimeState) => getFormHasErrors(state.formValidations.validations));
  const userParty: IParty = useSelector((state: IRuntimeState) => state.profile.profile ? state.profile.profile.party : {} as IParty);
  const validations: IValidations = useSelector((state: IRuntimeState) => state.formValidations.validations);
  const textResources: ITextResource[] = useSelector((state: IRuntimeState) => state.textResources.resources);
  const handleModalCloseButton = () => {
    const origin = window.location.origin;
    if (window) {
      window.location.href = returnUrlToMessagebox(origin);
    }
    return true;
  }

  const isProcessStepsArchived = Boolean(props.step === ProcessSteps.Archived);
  const backgroundColor = isProcessStepsArchived ?
    AltinnAppTheme.altinnPalette.primary.greenLight
    : AltinnAppTheme.altinnPalette.primary.blue;
  document.body.style.background = backgroundColor;

  return (
    <div id='processContainer' style={{ marginBottom: '1rem' }}>
        <AltinnAppHeader
          party={party}
          userParty={userParty}
          logoColor={AltinnAppTheme.altinnPalette.primary.blueDarker}
          headerBackgroundColor={backgroundColor}
        />
        <div className='container'>
          <div className={classNames('row', {['d-print-none']: isProcessStepsArchived})}>
            <div className='col-xl-10 offset-xl-1 a-p-static'>
              <ErrorReport
                formHasErrors={formHasErrors}
                language={language}
                validations={validations}
                textResources={textResources}
              />
              <NavBar handleClose={handleModalCloseButton} />
              <div className='a-modal-content-target'>
                <div className='a-page a-current-page'>
                  <div className='modalPage'>
                    <div className='modal-content'>
                      <Header {...props}/>
                      <div className='modal-body a-modal-body'>
                        {props.children}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {props.step === ProcessSteps.Archived &&
            <Box display='none' displayPrint='block'>
              <Typography variant='h2' style={{marginBottom: '2.1rem'}}>
                {getLanguageFromKey('receipt.receipt', language)}
              </Typography>
              <ReceiptContainer />
            </Box>
          }
      </div>
    </div>
  );
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

export default ProcessStepComponent;
