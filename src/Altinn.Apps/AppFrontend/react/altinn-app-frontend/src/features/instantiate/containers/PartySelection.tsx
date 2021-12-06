import {
  createStyles,
  Grid,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import * as React from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import { AltinnCheckBox } from 'altinn-shared/components';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { IParty } from 'altinn-shared/types';
import AltinnParty from '../../../shared/components/altinnParty';
import AltinnPartySearch from '../../../shared/components/altinnPartySearch';
import PartyActions from '../../../shared/resources/party/partyActions';
import { changeBodyBackground } from '../../../utils/bodyStyling';
import { HttpStatusCodes } from '../../../utils/networking';
import { capitalizeName } from '../../../utils/stringHelper';
import InstantiationContainer from './InstantiationContainer';
import NoValidPartiesError from './NoValidPartiesError';
import InstantiationActions from '../instantiation/actions/index';
import { useAppSelector } from 'src/common/hooks';

const styles = createStyles({
  partySelectionTitle: {
    fontSize: '3.5rem',
    fontWeight: 200,
    paddingBottom: 18,
    padding: 12,
  },
  partySelectionError: {
    fontSize: '1.75rem',
    fontWeight: 300,
    backgroundColor: AltinnAppTheme.altinnPalette.primary.redLight,
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
    backgroundColor: AltinnAppTheme.altinnPalette.primary.white,
    border: `2px dotted ${AltinnAppTheme.altinnPalette.primary.blue}`,
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
});

interface IRedirectParams {
  errorCode: HttpStatusCodes;
}

export interface IPartySelectionProps
  extends WithStyles<typeof styles>,
    RouteComponentProps {}

const PartySelectionWithRouter = withRouter((props: IPartySelectionProps) => {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.white);
  const { classes, match } = props;

  const language = useAppSelector(state => state.language.language);
  const parties = useAppSelector(state => state.party.parties);
  const appMetadata = useAppSelector(state => state.applicationMetadata.applicationMetadata);
  const selectedParty = useAppSelector(state => state.party.selectedParty);

  const [filterString, setFilterString] = React.useState('');
  const [numberOfPartiesShown, setNumberOfPartiesShown] = React.useState(4);
  const [showSubUnits, setShowSubUnits] = React.useState(true);
  const [showDeleted, setShowDeleted] = React.useState(false);

  React.useEffect(() => {
    PartyActions.getParties();
  }, []);

  const onSelectParty = (party: IParty) => {
    PartyActions.selectParty(party, true);
    // Clear any previous instantiation errors.
    InstantiationActions.instantiateRejected(null);
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
          <Grid container={true} direction='row'>
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
    const params = match.params as IRedirectParams;
    if (params.errorCode) {
      try {
        const errorCode: number = parseInt(params.errorCode.toString(), 10);
        switch (errorCode) {
          // Keeping the switch statement because we might extends the enums to handle more errors
          case HttpStatusCodes.Forbidden: {
            return (
              <Typography
                className={classes.partySelectionError}
                id='party-selection-error'
              >
                {`
                  ${
                    language.party_selection.invalid_selection_first_part
                  } ${getRepresentedPartyName()}.
                  ${
                    language.party_selection.invalid_selection_second_part
                  } ${templatePartyTypesString()}.
                  ${language.party_selection.invalid_selection_third_part}
                `}
              </Typography>
            );
          }
          default: {
            return null;
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.info('Could not parse number from params');
      }
    }
    return null;
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
    const { partyTypesAllowed } = appMetadata;
    const partyTypes: string[] = [];

    let returnString = '';

    if (partyTypesAllowed.person) {
      partyTypes.push(language.party_selection.unit_type_private_person);
    }
    if (partyTypesAllowed.organisation) {
      partyTypes.push(language.party_selection.unit_type_company);
    }
    if (partyTypesAllowed.subUnit) {
      partyTypes.push(language.party_selection.unit_type_subunit);
    }
    if (partyTypesAllowed.bankruptcyEstate) {
      partyTypes.push(language.party_selection.unit_type_bankruptcy_state);
    }

    if (partyTypes.length === 1) {
      return partyTypes[0];
    }

    for (let i = 0; i < partyTypes.length; i++) {
      if (i === 0) {
        returnString += partyTypes[i];
      } else if (i === partyTypes.length - 1) {
        returnString += ` ${language.party_selection.binding_word} ${partyTypes[i]}`;
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
        <Grid container={true} direction='row'>
          <AddIcon className={classes.loadMoreButtonIcon} />
          <Typography className={classes.loadMoreButtonText}>
            {!language.party_selection
              ? 'party_selection.load_more'
              : language.party_selection.load_more}
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
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        style={{
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        <Typography className={classes.partySelectionTitle}>
          {!language.party_selection
            ? 'party_selection.header'
            : language.party_selection.header}
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
      <Grid container={true} direction='column'>
        <Grid container={true} justifyContent='space-between' direction='row'>
          <Grid item={true}>
            <Typography className={classes.partySelectionSubTitle}>
              {!language.party_selection
                ? 'party_selection.subheader'
                : language.party_selection.subheader}
            </Typography>
          </Grid>

          <Grid item={true}>
            <Grid container={true} direction='row'>
              <Grid item={true} className={classes.partySelectionCheckbox}>
                <Grid container={true} direction='row'>
                  <AltinnCheckBox
                    checked={showDeleted}
                    onChangeFunction={toggleShowDeleted}
                  />
                  <Typography className={classes.checkboxLabes}>
                    {!language.party_selection
                      ? 'party_selection.show_deleted'
                      : language.party_selection.show_deleted}
                  </Typography>
                </Grid>
              </Grid>
              <Grid item={true} className={classes.partySelectionCheckbox}>
                <Grid container={true} direction='row'>
                  <AltinnCheckBox
                    checked={showSubUnits}
                    onChangeFunction={toggleShowSubUnits}
                  />
                  <Typography className={classes.checkboxLabes}>
                    {!language.party_selection
                      ? 'party_selection.show_sub_unit'
                      : language.party_selection.show_sub_unit}
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
});

export default withStyles(styles)(PartySelectionWithRouter);
