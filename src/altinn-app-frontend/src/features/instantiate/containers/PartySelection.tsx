import React from 'react';
import { useMatch } from 'react-router-dom';

import { Grid, makeStyles, Typography } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import { InstantiationContainer } from 'src/features/instantiate/containers';
import NoValidPartiesError from 'src/features/instantiate/containers/NoValidPartiesError';
import { InstantiationActions } from 'src/features/instantiate/instantiation/instantiationSlice';
import AltinnParty from 'src/shared/components/altinnParty';
import AltinnPartySearch from 'src/shared/components/altinnPartySearch';
import { PartyActions } from 'src/shared/resources/party/partySlice';
import { changeBodyBackground } from 'src/utils/bodyStyling';
import { HttpStatusCodes } from 'src/utils/networking';
import { capitalizeName } from 'src/utils/stringHelper';

import { AltinnCheckBox } from 'altinn-shared/components';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { getLanguageFromKey } from 'altinn-shared/utils';
import type { IParty } from 'altinn-shared/types';

const useStyles = makeStyles((theme) => ({
  partySelectionTitle: {
    fontSize: '3.5rem',
    fontWeight: 200,
    paddingBottom: 18,
    padding: 12,
  },
  partySelectionError: {
    fontSize: '1.75rem',
    fontWeight: 300,
    backgroundColor: theme.altinnPalette.primary.redLight,
    padding: 12,
    margin: 12,
  },
  partySearchFieldContainer: {
    paddingTop: 8,
    paddingLeft: 12,
  },
  partySelectionSubTitle: {
    fontSize: '1.75rem',
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
    marginLeft: '1.5rem',
  },
  loadMoreButtonText: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '1.75rem',
    marginLeft: '1.2rem',
    fontWeight: 500,
  },
  partySelectionCheckbox: {
    paddingTop: 24,
    padding: 12,
  },
  checkboxLabes: {
    paddingTop: '1.2rem',
  },
}));
const PartySelection = () => {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.white);
  const classes = useStyles();
  const match = useMatch(`/partyselection/:errorCode`);
  const errorCode = match?.params.errorCode;

  const dispatch = useAppDispatch();
  const language = useAppSelector((state) => state.language.language);
  const parties = useAppSelector((state) => state.party.parties);
  const appMetadata = useAppSelector(
    (state) => state.applicationMetadata.applicationMetadata,
  );
  const selectedParty = useAppSelector((state) => state.party.selectedParty);

  const [filterString, setFilterString] = React.useState('');
  const [numberOfPartiesShown, setNumberOfPartiesShown] = React.useState(4);
  const [showSubUnits, setShowSubUnits] = React.useState(true);
  const [showDeleted, setShowDeleted] = React.useState(false);

  React.useEffect(() => {
    dispatch(PartyActions.getParties());
  }, [dispatch]);

  const onSelectParty = (party: IParty) => {
    dispatch(PartyActions.selectParty({ party, redirect: true }));
    // Clear any previous instantiation errors.
    dispatch(InstantiationActions.instantiateRejected({ error: null }));
  };

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
        {numberOfPartiesRendered === numberOfPartiesShown &&
        numberOfPartiesRendered < parties.length ? (
          <Grid
            container={true}
            direction='row'
          >
            {renderShowMoreButton()}
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
    if (!language || !language.party_selection) {
      return null;
    }

    if (errorCode === `${HttpStatusCodes.Forbidden}`) {
      return (
        <Typography
          data-testid={`error-code-${HttpStatusCodes.Forbidden}`}
          className={classes.partySelectionError}
          id='party-selection-error'
        >
          {`${getLanguageFromKey(
            'party_selection.invalid_selection_first_part',
            language,
          )} ${getRepresentedPartyName()}.
            ${getLanguageFromKey(
              'party_selection.invalid_selection_second_part',
              language,
            )} ${templatePartyTypesString()}.
            ${getLanguageFromKey(
              'party_selection.invalid_selection_third_part',
              language,
            )}`}
        </Typography>
      );
    }
  }

  function templatePartyTypesString() {
    if (!language || !language.party_selection) {
      return null;
    }
    /*
      This method we allways return the strings in an order of:
      1. private person
      2. organisation
      3. sub unit
      4. bankruptcy state
    */
    const { partyTypesAllowed } = appMetadata || {};
    const partyTypes: string[] = [];

    let returnString = '';

    if (partyTypesAllowed?.person) {
      partyTypes.push(
        getLanguageFromKey(
          'party_selection.unit_type_private_person',
          language,
        ),
      );
    }
    if (partyTypesAllowed?.organisation) {
      partyTypes.push(
        getLanguageFromKey('party_selection.unit_type_company', language),
      );
    }
    if (partyTypesAllowed?.subUnit) {
      partyTypes.push(
        getLanguageFromKey('party_selection.unit_type_subunit', language),
      );
    }
    if (partyTypesAllowed?.bankruptcyEstate) {
      partyTypes.push(
        getLanguageFromKey(
          'party_selection.unit_type_bankruptcy_state',
          language,
        ),
      );
    }

    if (partyTypes.length === 1) {
      return partyTypes[0];
    }

    for (let i = 0; i < partyTypes.length; i++) {
      if (i === 0) {
        returnString += partyTypes[i];
      } else if (i === partyTypes.length - 1) {
        returnString += ` ${getLanguageFromKey(
          'party_selection.binding_word',
          language,
        )} ${partyTypes[i]}`;
      } else {
        returnString += `, ${partyTypes[i]} `;
      }
    }

    return returnString;
  }

  const onFilterStringChange = (filterStr: string) => {
    setFilterString(filterStr);
  };

  function increaseNumberOfShownParties() {
    setNumberOfPartiesShown(numberOfPartiesShown + 4);
  }

  function renderShowMoreButton() {
    if (!language) {
      return null;
    }
    return (
      <button
        className={classes.loadMoreButton}
        onClick={increaseNumberOfShownParties}
      >
        <Grid
          container={true}
          direction='row'
        >
          <AddIcon className={classes.loadMoreButtonIcon} />
          <Typography className={classes.loadMoreButtonText}>
            {getLanguageFromKey('party_selection.load_more', language)}
          </Typography>
        </Grid>
      </button>
    );
  }

  const toggleShowDeleted = () => {
    setShowDeleted(!showDeleted);
  };

  const toggleShowSubUnits = () => {
    setShowSubUnits(!showSubUnits);
  };

  if (!language) {
    return null;
  }

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
        <Typography className={classes.partySelectionTitle}>
          {getLanguageFromKey('party_selection.header', language)}
        </Typography>
        {templateErrorMessage()}
      </Grid>
      <Grid
        container={true}
        direction='column'
        className={classes.partySearchFieldContainer}
      >
        <AltinnPartySearch onSearchUpdated={onFilterStringChange} />
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
              {getLanguageFromKey('party_selection.subheader', language)}
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
                  <AltinnCheckBox
                    checked={showDeleted}
                    onChangeFunction={toggleShowDeleted}
                  />
                  <Typography className={classes.checkboxLabes}>
                    {getLanguageFromKey(
                      'party_selection.show_deleted',
                      language,
                    )}
                  </Typography>
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
                  <AltinnCheckBox
                    checked={showSubUnits}
                    onChangeFunction={toggleShowSubUnits}
                  />
                  <Typography className={classes.checkboxLabes}>
                    {getLanguageFromKey(
                      'party_selection.show_sub_unit',
                      language,
                    )}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        {renderParties()}
      </Grid>
    </InstantiationContainer>
  );
};

export default PartySelection;
