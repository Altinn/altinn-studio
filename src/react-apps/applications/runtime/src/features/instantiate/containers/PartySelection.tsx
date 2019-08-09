import { createStyles, Grid, Typography, withStyles, WithStyles } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { RouteProps, Redirect } from 'react-router';
import AltinnAppTheme from 'Shared/theme/altinnAppTheme';
import { IRuntimeState } from 'src/types';
import Header from '../../../shared/components/altinnAppHeader';
import AltinnParty from '../../../shared/components/altinnParty';
import AltinnPartySearch from '../../../shared/components/altinnPartySearch';
import { IApplicationMetadata } from '../../../shared/resources/applicationMetadata';
import { IParty } from '../../../shared/resources/party';
import PartyActions from '../../../shared/resources/party/partyActions';
import { IProfile } from '../../../shared/resources/profile';
import { changeBodyBackground } from '../../../utils/bodyStyling';
import { partiesUrl } from '../../../utils/urlHelper';

const styles = createStyles({
  partySelectionPage: {
    width: '100%',
    maxWidth: '1056px',
    backgroundColor: AltinnAppTheme.altinnPalette.primary.white,
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'center',
    padding: 12,
  },
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
});

interface IRedirectValidPartes {
  validParties: IParty[];
}

export interface IPartySelectionProps extends WithStyles<typeof styles>, RouteProps {
}

function PartySelection(props: IPartySelectionProps) {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.white);

  const { classes, location } = props;

  const language: any = useSelector((state: IRuntimeState) => state.language.language);
  const profile: IProfile = useSelector((state: IRuntimeState) => state.profile.profile);
  const parties: IParty[] = useSelector((state: IRuntimeState) => state.party.parties);
  const appMetadata: IApplicationMetadata = useSelector((state: IRuntimeState) =>
    state.applicationMetadata.applicationMetadata);

  const [filterString, setFilterString] = React.useState('');
  const [numberOfPartiesShown, setNumberOfPartiesShown] = React.useState(4);
  const [showSubUnits, setShowSubUnits] = React.useState(false);
  const [showDeleted, setShowDeleted] = React.useState(true);

  React.useEffect(() => {
    PartyActions.getParties(partiesUrl);
  }, []);

  async function onSelectParty(party: IParty) {
    PartyActions.selectParty(party, true);
  }

  function renderParties() {
    if (!parties || !appMetadata) {
      return null;
    }

    const validParties: IParty[] = parties.map((party) => {
      if (!showDeleted) {
        if ((party.ssn != null && appMetadata.partyTypesAllowed.person) && !party.isDeleted) {
          return party;
        }
        if ((party.orgNumber != null && appMetadata.partyTypesAllowed.organization) && !party.isDeleted) {
          return party;
        }
      } else {
        if ((party.ssn != null && appMetadata.partyTypesAllowed.person)) {
          return party;
        }
        if ((party.orgNumber != null && appMetadata.partyTypesAllowed.organization)) {
          return party;
        }
      }
    }).filter((party) => !party ? null : party);

    let numberOfPartiesRendered: number = 0;

    return (
      <>
        {parties.length > 0 && validParties.length === 0 ?
        <Redirect
          to={{
            pathname: '/error',
            state: {
              message: 'No valid parties',
            },
          }}
        /> :
        validParties.map((party: IParty, index: number) =>
          party.name.toUpperCase().indexOf(filterString.toUpperCase()) > -1 ?
            numberOfPartiesShown > numberOfPartiesRendered ?
              (() => {
                numberOfPartiesRendered += 1;
                return (
                  <AltinnParty
                    key={index}
                    party={party}
                    onSelectParty={onSelectParty}
                  />
                );
              })()
            : null
          : null,
        )}
        {numberOfPartiesRendered === numberOfPartiesShown && numberOfPartiesRendered < validParties.length ?
          <Grid container={true}>
            {renderShowMoreButton()}
          </Grid>
          : null
        }
      </>
    );
  }

  function templateErrorMessage() {
    if (!language.instantiate) {
      return null;
    }
    return `
      ${language.instantiate.party_selection_error_invalid_selection_first_part} ${profile.party.name}.
      ${language.instantiate.party_selection_error_invalid_selection_second_part} ${templatePartyTypesString()}.
      ${language.instantiate.party_selection_error_invalid_selection_third_part}
    `;
  }

  function templatePartyTypesString() {
    if (!language.instantiate) {
      return null;
    }
    /*
      This method we allways return the strings in an order of:
      1. private person
      2. organization
      3. sub unit
      4. bankruptcy state
    */
    const {partyTypesAllowed} = appMetadata;
    const partyTypes: string[] = [];

    let returnString: string = '';

    if (partyTypesAllowed.person) {
      partyTypes.push(language.instantiate.party_selection_unit_type_private_person);
    }
    if (partyTypesAllowed.organization) {
      partyTypes.push(language.instantiate.party_selection_unit_type_company);
    }
    if (partyTypesAllowed.subUnit) {
      partyTypes.push(language.instantiate.party_selection_unit_type_subunit);
    }
    if (partyTypesAllowed.bankruptcyEstate) {
      partyTypes.push(language.instantiate.party_selection_unit_type_bankruptcy_state);
    }

    if (partyTypes.length === 1) {
      return partyTypes[0];
    }

    for (let i = 0; i < partyTypes.length; i++) {
      if (i === 0) {
        returnString += partyTypes[i];
      } else if (i === (partyTypes.length - 1)) {
        returnString += ` ${language.instantiate.party_selection_error_binding_word} ${partyTypes[i]}`;
      } else {
        returnString += `, ${partyTypes[i]} `;
      }
    }

    return returnString;
  }

  function onFilterStringChange(filterStr: string) {
    setFilterString(filterStr);
  }

  function increaseNumberOfShownParties() {
    setNumberOfPartiesShown(numberOfPartiesShown + 4);
  }

  function renderShowMoreButton() {
    return (
      <button
        className={classes.loadMoreButton}
        onClick={increaseNumberOfShownParties}
      >
        <Grid container={true}>
            <AddIcon className={classes.loadMoreButtonIcon}/>
            <Typography className={classes.loadMoreButtonText}>
              {!language.instantiate ?
                'instantiate.party_selection_load_more' :
                language.instantiate.party_selection_load_more
              }
            </Typography>
        </Grid>
      </button>
    );
  }

  return (
    <Grid container={true} className={'container ' + classes.partySelectionPage}>
      <Header
        language={language}
        profile={profile}
        type={'normal'}
      />
      <Grid
        container={true}
        style={{
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        <Typography className={classes.partySelectionTitle}>
          {!language.instantiate ?
            'instantiate.party_selection_header' :
            language.instantiate.party_selection_header
          }
        </Typography>
        {!location.state || !(location.state as IRedirectValidPartes).validParties.length ?
          null :
          <Typography className={classes.partySelectionError}>
            {templateErrorMessage()}
          </Typography>
        }
      </Grid>
        <Grid container={true} className={classes.partySearchFieldContainer}>
          <AltinnPartySearch
            onSearchUpdated={onFilterStringChange}
          />
        </Grid>
        <Grid container={true}>
          <Typography className={classes.partySelectionSubTitle}>
            {!language.instantiate ?
              'instantiate.party_selection_subheader' :
              language.instantiate.party_selection_subheader
            }
          </Typography>
          {renderParties()}
        </Grid>
    </Grid>
  );
}

export default withStyles(styles)(PartySelection);
