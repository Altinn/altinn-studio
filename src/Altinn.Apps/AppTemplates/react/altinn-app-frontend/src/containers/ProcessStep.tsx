/* eslint-disable no-prototype-builtins */
/* eslint-disable react/prop-types */
/* eslint-disable no-restricted-syntax */
import * as React from 'react';
import { useSelector } from 'react-redux';
import { AltinnAppHeader } from 'altinn-shared/components';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { IParty } from 'altinn-shared/types';
import { IRuntimeState, ProcessSteps } from 'src/types';

export interface IProcessStepProvidedProps {
  header: string;
  step: ProcessSteps;
  children: JSX.Element;
}

const ProcessStepComponent = (props) => {
  const party: IParty = useSelector((state: IRuntimeState) => (state.party ? state.party.selectedParty : {} as IParty));
  const userParty: IParty = useSelector(
    (state: IRuntimeState) => (state.profile.profile ? state.profile.profile.party : {} as IParty),
  );

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
        {props.children}
      </div>
    </div>
  );
};

export default ProcessStepComponent;
