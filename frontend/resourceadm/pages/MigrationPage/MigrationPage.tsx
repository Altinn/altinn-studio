import React, { useState } from 'react';
import classes from './MigrationPage.module.css';
import { MigrationStep } from 'resourceadm/components/MigrationStep';
import { Checkbox, Button, TextField } from '@digdir/design-system-react';
import { Link } from 'resourceadm/components/Link';
import { ExternalLinkIcon } from '@navikt/aksel-icons';

/**
 * Page that shows the information about migrating from Altinn 2 to Altinn 3
 */
export const MigrationPage = () => {
  const [step1Checked, setStep1Checked] = useState(false);
  const [step2Checked, setStep2Checked] = useState(false);
  const [step3Checked, setStep3Checked] = useState(false);
  const [beforeStartChecked, setBeforeStartChecked] = useState(false);

  // TODO - This might be a saved value from backend
  const initialDate = new Date().toISOString().split('T')[0];
  const [migrationDate, setMigrationDate] = useState(initialDate);
  const [migrationTime, setMigrationTime] = useState('00:00');

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
        <div className={classes.contentDivider} />
        <h3 className={classes.header3}>Før du begynner migrering</h3>
        <div className={classes.checkboxWrapper}>
          <Checkbox
            label='Integrasjon mot Altinn funker'
            checked={beforeStartChecked}
            onChange={(e) => setBeforeStartChecked(e.target.checked)}
          />
          <div className={classes.linkWrapper}>
            <Link
              text='Dokumentasjon'
              href='' // TODO
              icon={<ExternalLinkIcon title='Dokumentasjon' />}
            />
          </div>
        </div>
        <h3 className={classes.header3}>Velg tidspunkt for migrering</h3>
        <p className={classes.text}>
          Velg dato og tid tjenesten skal migreres fra altinn II til altinn 3. Vi anbefaler at dette
          gjøres på et tidspunkt der tjenesten har lite eller ingen trafikk. For eksempel midt på
          natten.
        </p>
        <div className={classes.datePickers}>
          <div className={classes.datePickerWrapper}>
            <TextField
              type='date'
              value={migrationDate}
              onChange={(e) => setMigrationDate(e.target.value)}
              label='Migreringsdato'
            />
          </div>
          <div className={classes.datePickerWrapper}>
            <TextField
              type='time'
              value={migrationTime}
              onChange={(e) => setMigrationTime(e.target.value)}
              label='Klokkeslett'
            />
          </div>
        </div>
        <div className={classes.migrateBox}>
          <h3 className={classes.header3}>Velg tidspunkt for migrering</h3>
          <p className={classes.text}>
            Jeg forstår at å trykke <strong>start migrering</strong> fører til at følgende
            handlinger iverksettes.
          </p>
          <div className={classes.migrateSteps}>
            <p>TODO steps</p>
          </div>
          <Button onClick={() => {}}>Start migrering</Button>
        </div>
      </div>
    </div>
  );
};
