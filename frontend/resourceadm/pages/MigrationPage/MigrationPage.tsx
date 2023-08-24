import React, { useState } from 'react';
import classes from './MigrationPage.module.css';
import { useParams } from 'react-router-dom';
import { useValidatePolicyQuery, useValidateResourceQuery } from 'resourceadm/hooks/queries';
import { MigrationStep } from 'resourceadm/components/MigrationStep';
import {
  Button,
  TextField,
  Select,
  Heading,
  Paragraph,
  Spinner,
  Label,
  Link,
} from '@digdir/design-system-react';
import type { NavigationBarPage } from 'resourceadm/types/global';

const envOptions = [
  { value: 'Testmiljø TT-02', label: 'Testmiljø TT-02' },
  { value: 'Produksjonsmiljø', label: 'Produksjonsmiljø' },
];

type MigrationPageProps = {
  /**
   * Function that navigates to a page with errors
   * @param page the page to navigate to
   * @returns void
   */
  navigateToPageWithError: (page: NavigationBarPage) => void;
};

/**
 * @component
 *    Page that shows the information about migrating from Altinn 2 to Altinn 3
 *
 * @property {function}[navigateToPageWithError] - Function that navigates to a page with errors
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const MigrationPage = ({ navigateToPageWithError }: MigrationPageProps): React.ReactNode => {
  const { selectedContext, resourceId } = useParams();
  const repo = `${selectedContext}-resources`;

  const { data: validatePolicyData, isLoading: validatePolicyLoading } = useValidatePolicyQuery(
    selectedContext,
    repo,
    resourceId
  );
  const { data: validateResourceData, isLoading: validateResourceLoading } =
    useValidateResourceQuery(selectedContext, repo, resourceId);

  // TODO - API call
  const deployOK = false;

  // TODO - This might be a saved value from backend
  const initialDate = new Date().toISOString().split('T')[0];
  const [migrationDate, setMigrationDate] = useState(initialDate);
  const [migrationTime, setMigrationTime] = useState('00:00');
  const [selectedEnv, setSelectedEnv] = useState('');
  const [numDelegationsA2, setNumDelegationsA2] = useState<number>(undefined);
  const [numDelegationsA3, setNumDelegationsA3] = useState<number>(undefined);

  /**
   * Display the content on the page
   */
  const displayContent = () => {
    if (validatePolicyLoading || validateResourceLoading) {
      return (
        <div className={classes.spinnerWrapper}>
          <Spinner size='3xLarge' variant='interaction' title='Laster inn policy' />
        </div>
      );
    }
    return (
      <>
        <Heading size='large' spacing level={1}>
          Migrering av Altinn 2 tjeneste
        </Heading>
        <div className={classes.contentWrapper}>
          <div className={classes.introWrapper}>
            <Paragraph size='small'>
              Denne ressursen er basert på en Altinn 2 lenketjeneste. På denne siden får du oversikt
              over status på migrering av denne lenketjenesten fra Altinn 2.{' '}
            </Paragraph>
            <Link
              href='https://docs.altinn.studio/authorization/modules/resourceregistry/'
              rel='noopener noreferrer'
              target='_blank'
            >
              Les mer i vår dokumentasjon om ressursregisteret og migrering av ressurser.
            </Link>
          </div>
          <MigrationStep
            title='Steg 1 - Om Ressursen'
            text={
              validateResourceData.status === 200
                ? 'Ressursinformasjonen er klar for å fullføre migrering'
                : `Det er ${validateResourceData.errors.length} mangler på siden "Om Ressursen" som må fikses før du kan fullføre migrering.`
            }
            isSuccess={validateResourceData.status === 200}
            onNavigateToPageWithError={navigateToPageWithError}
            page='about'
          />
          <MigrationStep
            title='Steg 2 - Tilgangsregler'
            text={
              validatePolicyData === undefined
                ? 'Det finnes ingen tilgangsregler på siden "Tilgangsregler". Du må ha minst en regel for å fullføre migreringen.'
                : validatePolicyData.status === 200
                ? 'Tilgangsreglene er klar for å fullføre migrering'
                : `Det er ${validatePolicyData.errors.length} mangler på siden "Tilgangsregler" som må fikses før du kan fullføre migrering.`
            }
            isSuccess={validatePolicyData?.status === 200 ?? false}
            onNavigateToPageWithError={navigateToPageWithError}
            page='policy'
          />
          <MigrationStep
            title='Steg 3 - Publisering'
            text={
              deployOK
                ? 'Publisering er gjennomført'
                : 'Du må publisere ressursen på siden "Publiser" før du kan fullføre migrering.'
            }
            isSuccess={deployOK}
            onNavigateToPageWithError={navigateToPageWithError}
            page='deploy'
          />
          <div className={classes.contentDivider} />
          <Label size='medium' spacing>
            Velg miljø du vil migrere til
          </Label>
          <Paragraph size='small'>
            Velg et miljø fra listen under du vil migrere til. Vi anbefaler å teste en migrering til
            test-miljøet før du gjennomfører en full migrering til produksjonsmiljøet.
          </Paragraph>
          <div className={classes.selectEnv}>
            <Select
              label='Velg miljø å migrere til'
              hideLabel
              options={envOptions}
              value={selectedEnv}
              onChange={(o: string) => setSelectedEnv(o)}
            />
          </div>
          {selectedEnv !== '' && (
            <>
              <Label size='medium' spacing>
                Velg tidspunkt for å flytte delegeringer og fullføre migreringen
              </Label>
              <Paragraph size='small'>
                Velg dato og tid der tjenesten skal flytte delegeringene, og fullføre migreringen
                fra Altinn 2 til Altinn 3. Vi anbefaler at dette gjøres på et tidspunkt der
                tjenesten har lite eller ingen trafikk. For eksempel midt på natten.
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
              <div className={classes.numDelegations}>
                <Label size='medium' spacing>
                  Antall delegeringer i Altinn 2 og Altinn 3
                </Label>
                <Button
                  onClick={() => {
                    // TODO - replace with API call
                    setNumDelegationsA2(1000);
                    setNumDelegationsA3(1000);
                  }}
                  className={classes.button}
                >
                  Hent antall delegeringer
                </Button>
                {numDelegationsA2 && numDelegationsA3 && (
                  <div className={classes.delegations}>
                    <Paragraph size='small'>
                      Altinn 2: <strong>{numDelegationsA2}</strong> delegeringer
                    </Paragraph>
                    <Paragraph size='small'>
                      Altinn 3: <strong>{numDelegationsA3}</strong> delegeringer
                    </Paragraph>
                  </div>
                )}
              </div>
              <Label size='medium' spacing>
                Fullfør migrering
              </Label>
              <Paragraph size='small'>
                For at brukere med eksisterende tilganger til tjenesten i Altinn 2 skal videreføre
                sine tilganger for ny tjeneste migrert til Altinn 2 må delegeringene migreres til
                Altinn 3. Les detaljer om prosessen i vår dokumentasjon.
              </Paragraph>
              <div className={classes.buttonWrapper}>
                <Button
                  aria-disabled={
                    !(
                      validateResourceData.status === 200 &&
                      validatePolicyData?.status === 200 &&
                      deployOK
                    )
                  }
                  onClick={
                    validateResourceData.status === 200 &&
                    validatePolicyData?.status === 200 &&
                    deployOK
                      ? () => {} // TODO
                      : undefined
                  }
                  className={classes.button}
                >
                  Migrer delegeringer
                </Button>
                <Button
                  aria-disabled // Remember to do same check for aria-disabled as fot button below
                  onClick={() => {}}
                  className={classes.button}
                >
                  Skru av tjenesten i Altinn 2
                </Button>
              </div>
            </>
          )}
        </div>
      </>
    );
  };

  return <div className={classes.pageWrapper}>{displayContent()}</div>;
};
