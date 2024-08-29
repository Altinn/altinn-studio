import React from 'react';
import { useMatch } from 'react-router-dom';

import { LegacyCheckbox } from '@digdir/design-system-react';
import { Button, Textfield } from '@digdir/designsystemet-react';
import { Grid, makeStyles, Typography } from '@material-ui/core';
import { PlusIcon } from '@navikt/aksel-icons';

import { AltinnParty } from 'src/components/altinnParty';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { InstantiationContainer } from 'src/features/instantiate/containers/InstantiationContainer';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import {
  useCurrentParty,
  useParties,
  useSetCurrentParty,
  useSetHasSelectedParty,
} from 'src/features/party/PartiesProvider';
import { useNavigate } from 'src/features/routing/AppRoutingContext';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { changeBodyBackground } from 'src/utils/bodyStyling';
import { HttpStatusCodes } from 'src/utils/network/networking';
import { capitalizeName } from 'src/utils/stringHelper';
import type { IParty } from 'src/types/shared';

const useStyles = makeStyles((theme) => ({
  partySelectionTitle: {
    fontSize: '2.1875rem',
    fontWeight: 200,
    paddingBottom: 18,
    padding: 12,
  },
  partySelectionError: {
    fontSize: '1.093rem',
    fontWeight: 300,
    backgroundColor: theme.altinnPalette.primary.redLight,
    padding: 12,
    margin: 12,
  },
  partySearchFieldContainer: {
    padding: '8px 12px 0 12px',
    width: '100%',
    '@media screen and (min-width: 768px)': {
      width: '50%',
    },
  },
  partySelectionSubTitle: {
    fontSize: '1.093rem',
    fontWeight: 600,
    paddingTop: 24,
    paddingBottom: 18,
    padding: 12,
  },
  loadMoreButton: {
    padding: 5,
    backgroundColor: theme.altinnPalette.primary.white,
    border: `2px dotted ${theme.altinnPalette.primary.blue}`,
  },
  loadMoreButtonIcon: {
    marginLeft: '0.9375rem',
  },
  loadMoreButtonText: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '1.093rem',
    marginLeft: '0.75rem',
    fontWeight: 500,
  },
  partySelectionCheckbox: {
    paddingTop: 24,
    padding: 12,
  },
  checkboxLabels: {
    paddingTop: '0.75rem',
  },
}));

export const PartySelection = () => {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.white);
  const classes = useStyles();
  const match = useMatch(`/party-selection/:errorCode`);
  const errorCode = match?.params.errorCode;

  const selectParty = useSetCurrentParty();
  const selectedParty = useCurrentParty();
  const setUserHasSelectedParty = useSetHasSelectedParty();

  const parties = useParties() ?? [];
  const appMetadata = useApplicationMetadata();

  const appPromptForPartyOverride = appMetadata.promptForParty;
  const { langAsString } = useLanguage();

  const [filterString, setFilterString] = React.useState('');
  const [numberOfPartiesShown, setNumberOfPartiesShown] = React.useState(4);
  const [showSubUnits, setShowSubUnits] = React.useState(true);
  const [showDeleted, setShowDeleted] = React.useState(false);
  const navigate = useNavigate();

  const onSelectParty = async (party: IParty) => {
    await selectParty(party);
    setUserHasSelectedParty(true);
    navigate('/');
  };

  const filteredParties = parties
    .filter(
      (party) => party.name.toUpperCase().includes(filterString.toUpperCase()) && !(party.isDeleted && !showDeleted),
    )
    .slice(0, numberOfPartiesShown);

  const hasMoreParties = filteredParties.length < parties.length;

  function renderParties() {
    return (
      <>
        {filteredParties.map((party, index) => (
          <AltinnParty
            key={index}
            party={party}
            onSelectParty={onSelectParty}
            showSubUnits={showSubUnits}
          />
        ))}
        {hasMoreParties ? (
          <Grid
            container={true}
            direction='row'
          >
            <Button
              size='small'
              variant='secondary'
              onClick={() => setNumberOfPartiesShown(numberOfPartiesShown + 4)}
            >
              {
                <PlusIcon
                  fontSize='1rem'
                  aria-hidden
                />
              }
              {langAsString('party_selection.load_more')}
            </Button>
          </Grid>
        ) : null}
      </>
    );
  }

  function getRepresentedPartyName(): string {
    if (!selectedParty || selectedParty.name === null) {
      return '';
    }
    return capitalizeName(selectedParty.name);
  }

  function templateErrorMessage() {
    if (errorCode === '403') {
      return (
        <Typography
          data-testid={`error-code-${HttpStatusCodes.Forbidden}`}
          className={classes.partySelectionError}
          id='party-selection-error'
        >
          {`${langAsString('party_selection.invalid_selection_first_part')} ${getRepresentedPartyName()}.
            ${langAsString('party_selection.invalid_selection_second_part')} ${templatePartyTypesString()}.
            ${langAsString('party_selection.invalid_selection_third_part')}`}
        </Typography>
      );
    }
  }

  function templatePartyTypesString() {
    /*
      This method we always return the strings in an order of:
      1. private person
      2. organisation
      3. sub unit
      4. bankruptcy state
    */
    const { partyTypesAllowed } = appMetadata ?? {};
    const partyTypes: string[] = [];

    let returnString = '';

    if (partyTypesAllowed?.person) {
      partyTypes.push(langAsString('party_selection.unit_type_private_person'));
    }
    if (partyTypesAllowed?.organisation) {
      partyTypes.push(langAsString('party_selection.unit_type_company'));
    }
    if (partyTypesAllowed?.subUnit) {
      partyTypes.push(langAsString('party_selection.unit_type_subunit'));
    }
    if (partyTypesAllowed?.bankruptcyEstate) {
      partyTypes.push(langAsString('party_selection.unit_type_bankruptcy_state'));
    }

    if (partyTypes.length === 1) {
      return partyTypes[0];
    }

    for (let i = 0; i < partyTypes.length; i++) {
      if (i === 0) {
        returnString += partyTypes[i];
      } else if (i === partyTypes.length - 1) {
        returnString += ` ${langAsString('party_selection.binding_word')} ${partyTypes[i]}`;
      } else {
        returnString += `, ${partyTypes[i]} `;
      }
    }

    return returnString;
  }

  const onFilterStringChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterString(event.target.value);
  };

  const toggleShowDeleted = () => {
    setShowDeleted(!showDeleted);
  };

  const toggleShowSubUnits = () => {
    setShowSubUnits(!showSubUnits);
  };

  return (
    <InstantiationContainer>
      <Grid
        container={true}
        direction='row'
        style={{
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        <Typography
          variant='h1'
          className={classes.partySelectionTitle}
        >
          {langAsString('party_selection.header')}
        </Typography>
        {templateErrorMessage()}
      </Grid>
      <Grid
        container={true}
        direction='column'
        className={classes.partySearchFieldContainer}
      >
        <Textfield
          aria-label={langAsString('party_selection.search_placeholder')}
          placeholder={langAsString('party_selection.search_placeholder')}
          onChange={onFilterStringChange}
          value={filterString}
          inputMode='search'
        />
      </Grid>
      <Grid
        container={true}
        direction='column'
      >
        <Grid
          container={true}
          justifyContent='space-between'
          direction='row'
        >
          <Grid item={true}>
            <Typography className={classes.partySelectionSubTitle}>
              {langAsString('party_selection.subheader')}
            </Typography>
          </Grid>

          <Grid item={true}>
            <Grid
              container={true}
              direction='row'
            >
              <Grid
                item={true}
                className={classes.partySelectionCheckbox}
              >
                <Grid
                  container={true}
                  direction='row'
                >
                  <LegacyCheckbox
                    checked={showDeleted}
                    onChange={toggleShowDeleted}
                    label={langAsString('party_selection.show_deleted')}
                  />
                </Grid>
              </Grid>
              <Grid
                item={true}
                className={classes.partySelectionCheckbox}
              >
                <Grid
                  container={true}
                  direction='row'
                >
                  <LegacyCheckbox
                    checked={showSubUnits}
                    onChange={toggleShowSubUnits}
                    label={langAsString('party_selection.show_sub_unit')}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        {renderParties()}
        {errorCode === 'explained' && (
          <Grid style={{ padding: 12 }}>
            <Typography
              variant='h2'
              style={{ fontSize: '1.5rem', fontWeight: '500', marginBottom: 12 }}
            >
              {langAsString('party_selection.why_seeing_this')}
            </Typography>
            <Typography variant='body1'>
              <Lang
                id={
                  appPromptForPartyOverride === 'always'
                    ? 'party_selection.seeing_this_override'
                    : 'party_selection.seeing_this_preference'
                }
              />
            </Typography>
          </Grid>
        )}
      </Grid>
    </InstantiationContainer>
  );
};
