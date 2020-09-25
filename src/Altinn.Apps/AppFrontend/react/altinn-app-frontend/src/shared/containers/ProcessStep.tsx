/* eslint-disable no-prototype-builtins */
/* eslint-disable react/prop-types */
/* eslint-disable no-restricted-syntax */
import * as React from 'react';
import { useSelector } from 'react-redux';
import { AltinnAppHeader, AltinnSubstatusPaper } from 'altinn-shared/components';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { IParty, IInstance } from 'altinn-shared/types';
import { returnUrlToMessagebox, getTextResourceByKey } from 'altinn-shared/utils';
import { IRuntimeState, ProcessSteps, IValidations, ITextResource } from 'src/types';
import ErrorReport from '../../components/message/ErrorReport';
import Header from '../../components/process-step/Header';
import NavBar from '../../components/process-step/NavBar';

export interface IProcessStepProvidedProps {
  header: string;
  step: ProcessSteps;
  children: JSX.Element;
}

const ProcessStepComponent = (props) => {
  const party: IParty = useSelector((state: IRuntimeState) => (state.party ? state.party.selectedParty : {} as IParty));
  const language: any = useSelector((state: IRuntimeState) => (state.language ? state.language.language : {}));
  const instance: IInstance = useSelector((state: IRuntimeState) => state.instanceData.instance);
  const formHasErrors: boolean = useSelector(
    (state: IRuntimeState) => getFormHasErrors(state.formValidations.validations),
  );
  const userParty: IParty = useSelector(
    (state: IRuntimeState) => (state.profile.profile ? state.profile.profile.party : {} as IParty),
  );
  const validations: IValidations = useSelector((state: IRuntimeState) => state.formValidations.validations);
  const textResources: ITextResource[] = useSelector((state: IRuntimeState) => state.textResources.resources);
  const handleModalCloseButton = () => {
    const origin = window.location.origin;
    if (window) {
      window.location.href = returnUrlToMessagebox(origin, party.partyId);
    }
    return true;
  };

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
        <div className='row'>
          <div className='col-xl-10 offset-xl-1 a-p-static'>
            <ErrorReport
              formHasErrors={formHasErrors}
              language={language}
              validations={validations}
              textResources={textResources}
            />
            {isProcessStepsArchived && instance?.status?.substatus &&
            <AltinnSubstatusPaper
              label={getTextResourceByKey(instance.status.substatus.label, textResources)}
              description={getTextResourceByKey(instance.status.substatus.description, textResources)}
            />}
            <NavBar
              handleClose={handleModalCloseButton}
              language={language}
            />
            <div className='a-modal-content-target'>
              <div className='a-page a-current-page'>
                <div className='modalPage'>
                  <div className='modal-content'>
                    <Header {...props} language={language}/>
                    <div className='modal-body a-modal-body'>
                      {props.children}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
