import React, { useState } from 'react';
import classes from './MigrationPage.module.css';
import { MigrationStep } from 'resourceadm/components/MigrationStep';

export const MigrationPage = () => {
  const [step1Checked, setStep1Checked] = useState(false);
  const [step2Checked, setStep2Checked] = useState(false);
  const [step3Checked, setStep3Checked] = useState(false);

  return (
    <div className={classes.pageWrapper}>
      <h1 className={classes.pageHeader}>Migrering av Altinn II tjeneste</h1>
      <div className={classes.contentWrapper}>
        <MigrationStep
          title='Steg 1:'
          text='Se over og fyll ut manglende informasjon for tjenesten'
          checkboxText='Jeg har oppdatert om ressursen'
          isChecked={step1Checked}
          onToggle={(checked: boolean) => setStep1Checked(checked)}
        />
        <MigrationStep
          title='Steg 2:'
          text='Se over og oppdater tilgangene til tjenesten'
          checkboxText='Jeg har oppdatert policy'
          isChecked={step2Checked}
          onToggle={(checked: boolean) => setStep2Checked(checked)}
        />
        <MigrationStep
          title='Steg 3:'
          text='Se over og publiser ressursen til produksjonsmiljøet'
          checkboxText='Jeg har publisert ressursen til produksjonsmiljøet'
          isChecked={step3Checked}
          onToggle={(checked: boolean) => setStep3Checked(checked)}
        />
      </div>
    </div>
  );
};
