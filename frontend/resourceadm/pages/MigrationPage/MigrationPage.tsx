import React, { useState } from 'react';
import classes from './MigrationPage.module.css';
import { MigrationStep } from 'resourceadm/components/MigrationStep';
import { Checkbox, Button, TextField, Heading, Paragraph } from '@digdir/design-system-react';
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
      <Heading size='large' spacing level={1}>
        Migrering av Altinn II tjeneste
      </Heading>
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
        <Heading size='xsmall' spacing level={2}>
          Før du begynner migrering
        </Heading>
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
        <Heading size='xsmall' spacing level={3}>
          Velg tidspunkt for migrering
        </Heading>
        <Paragraph size='small'>
          Velg dato og tid tjenesten skal migreres fra altinn II til altinn 3. Vi anbefaler at dette
          gjøres på et tidspunkt der tjenesten har lite eller ingen trafikk. For eksempel midt på
          natten.
        </Paragraph>
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
          <Heading size='xsmall' spacing level={3}>
            Migrering av tjeneste
          </Heading>
          <Paragraph size='small'>
            Jeg forstår at å trykke <strong>start migrering</strong> fører til at følgende
            handlinger iverksettes.
          </Paragraph>
          <div className={classes.migrateSteps}>
            <Paragraph size='small'>TODO steps</Paragraph>
          </div>
          <Button onClick={() => {}}>Start migrering</Button>
        </div>
      </div>
    </div>
  );
};
