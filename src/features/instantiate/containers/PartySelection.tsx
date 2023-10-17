import React, { useEffect } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';

import { Button, LegacyCheckbox, Textfield } from '@digdir/design-system-react';
import { Grid, makeStyles, Typography } from '@material-ui/core';
import { PlusIcon } from '@navikt/aksel-icons';

import { AltinnParty } from 'src/components/altinnParty';
import { InstantiationContainer } from 'src/features/instantiate/containers/InstantiationContainer';
import { NoValidPartiesError } from 'src/features/instantiate/containers/NoValidPartiesError';
import { InstantiationActions } from 'src/features/instantiate/instantiation/instantiationSlice';
import { useSelectPartyMutation } from 'src/hooks/mutations/useSelectPartyMutation';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useLanguage } from 'src/hooks/useLanguage';
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
  checkboxLabes: {
    paddingTop: '0.75rem',
  },
}));
export const PartySelection = () => {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.white);
  const classes = useStyles();
  const match = useMatch(`/partyselection/:errorCode`);
  const errorCode = match?.params.errorCode;

  const { mutate: selectPartyMutate, isSuccess: hasSelectedParty } = useSelectPartyMutation();

  const dispatch = useAppDispatch();
  const parties = useAppSelector((state) => state.party.parties);
  const appMetadata = useAppSelector((state) => state.applicationMetadata.applicationMetadata);
  const selectedParty = useAppSelector((state) => state.party.selectedParty);

  const appPromptForPartyOverride = useAppSelector(
    (state) => state.applicationMetadata.applicationMetadata?.promptForParty,
  );
  const autoRedirect = useAppSelector((state) => state.party.autoRedirect);

  const { langAsString, lang } = useLanguage();

  const [filterString, setFilterString] = React.useState('');
  const [numberOfPartiesShown, setNumberOfPartiesShown] = React.useState(4);
  const [showSubUnits, setShowSubUnits] = React.useState(true);
  const [showDeleted, setShowDeleted] = React.useState(false);

  const navigate = useNavigate();

  const onSelectParty = (party: IParty) => {
    selectPartyMutate(party);
    // Clear any previous instantiation errors.
    dispatch(InstantiationActions.instantiateRejected({ error: null }));
  };

  useEffect(() => {
    if (selectedParty && hasSelectedParty) {
      navigate('/');
    }
  }, [selectedParty, navigate, hasSelectedParty]);

  function renderParties() {
    if (!parties || !appMetadata) {
      return null;
    }

    if (parties.length === 0) {
      return <NoValidPartiesError />;
    }

    let numberOfPartiesRendered = 0;

    return (
      <>
        {parties.map((party: IParty, index: number) =>
          party.name.toUpperCase().indexOf(filterString.toUpperCase()) > -1
            ? numberOfPartiesShown > numberOfPartiesRendered
              ? (() => {
                  numberOfPartiesRendered += 1;
                  if (party.isDeleted && !showDeleted) {
                    return null;
                  }
                  return (
                    <AltinnParty
                      key={index}
                      party={party}
                      onSelectParty={onSelectParty}
                      showSubUnits={showSubUnits}
                    />
                  );
                })()
              : null
            : null,
        )}
        {numberOfPartiesRendered === numberOfPartiesShown && numberOfPartiesRendered < parties.length ? (
          <Grid
            container={true}
            direction='row'
          >
            <Button
              size='small'
              variant='secondary'
              dashedBorder={true}
              icon={<PlusIcon aria-hidden />}
              onClick={() => setNumberOfPartiesShown(numberOfPartiesShown + 4)}
            >
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
    if (errorCode === `${HttpStatusCodes.Forbidden}`) {
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

  function autoRedirectMessage() {
    if (!autoRedirect) {
      return null;
    }

    const appOverride = appPromptForPartyOverride === 'always';

    return (
      <Grid style={{ padding: 12 }}>
        <Typography
          variant='h2'
          style={{ fontSize: '1.5rem', fontWeight: '500', marginBottom: 12 }}
        >
          {langAsString('party_selection.why_seeing_this')}
        </Typography>
        <Typography variant='body1'>
          {lang(appOverride ? 'party_selection.seeing_this_override' : 'party_selection.seeing_this_preference')}
        </Typography>
      </Grid>
    );
  }

  function templatePartyTypesString() {
    /*
      This method we always return the strings in an order of:
      1. private person
      2. organisation
      3. sub unit
      4. bankruptcy state
    */
    const { partyTypesAllowed } = appMetadata || {};
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
    <InstantiationContainer type='partyChoice'>
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
        {autoRedirectMessage()}
      </Grid>
    </InstantiationContainer>
  );
};
