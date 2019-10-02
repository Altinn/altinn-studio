import { createStyles, Grid, Typography, withStyles, WithStyles } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { Redirect, RouteProps } from 'react-router';
import AltinnCheckBox from '../../../../../shared/src/components/AltinnCheckBox';
import AltinnAppTheme from '../../../../../shared/src/theme/altinnAppTheme';
import Header from '../../../shared/components/altinnAppHeader';
import AltinnParty from '../../../shared/components/altinnParty';
import AltinnPartySearch from '../../../shared/components/altinnPartySearch';
import { IApplicationMetadata } from '../../../shared/resources/applicationMetadata';
import { IParty } from '../../../shared/resources/party';
import PartyActions from '../../../shared/resources/party/partyActions';
import { IProfile } from '../../../shared/resources/profile';
import { IRuntimeState } from '../../../types';
import { changeBodyBackground } from '../../../utils/bodyStyling';
import { capitalizeName } from '../../../utils/stringHelper';

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
  partySelectionCheckbox: {
    paddingTop: 24,
    padding: 12,
  },
  checkboxLabes: {
    paddingTop: '1.2rem',
  },
});

export enum PartySelectionReason {
  NotValid,
}

interface IRedirectReason {
  errorType: PartySelectionReason;
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
  const selectedParty: IParty = useSelector((state: IRuntimeState) => state.party.selectedParty);

  const [filterString, setFilterString] = React.useState('');
  const [numberOfPartiesShown, setNumberOfPartiesShown] = React.useState(4);
  const [showSubUnits, setShowSubUnits] = React.useState(true);
  const [showDeleted, setShowDeleted] = React.useState(false);

  React.useEffect(() => {
    PartyActions.getParties();
  }, []);

  async function onSelectParty(party: IParty) {
    PartyActions.selectParty(party, true);
  }

  function renderParties() {
    if (!parties || !appMetadata) {
      return null;
    }

    let validParties: IParty[];

    validParties = parties.map((party) => {
      if (!showDeleted) {
        if (!party.isDeleted) {
          return party;
        }
      } else {
        return party;
      }
    }).filter((party) => !party ? null : party);

    let numberOfPartiesRendered: number = 0;

    if (validParties.length === 0) {
      return (
        <Redirect
          to={{
            pathname: '/error',
            state: {
              message: 'No valid parties',
            },
          }}
        />
      );
    }

    return (
      <>
        {validParties.map((party: IParty, index: number) =>
          party.name.toUpperCase().indexOf(filterString.toUpperCase()) > -1 ?
            numberOfPartiesShown > numberOfPartiesRendered ?
              (() => {
                numberOfPartiesRendered += 1;
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
        {numberOfPartiesRendered === numberOfPartiesShown && numberOfPartiesRendered < validParties.length ?
          <Grid container={true} direction={'row'}>
            {renderShowMoreButton()}
          </Grid>
          : null
        }
      </>
    );
  }

  function getRepresentedPartyName(): string {
    if (!selectedParty || selectedParty.name === null) {
      return '';
    }
    return capitalizeName(selectedParty.name);
  }

  function templateErrorMessage() {
    if (!language || !language.party_selection) {
      return null;
    }
    if (location.state !== undefined &&
      (location.state as IRedirectReason) &&
      (location.state as IRedirectReason) !== undefined) {
        switch ((location.state as IRedirectReason).errorType) {
          // Keeping the switch statement because we might extends the enums to handle more errors
          case PartySelectionReason.NotValid: {
            return (
              <Typography className={classes.partySelectionError}>
                {`
                  ${language.party_selection.invalid_selection_first_part} ${getRepresentedPartyName()}.
                  ${language.party_selection.invalid_selection_second_part} ${templatePartyTypesString()}.
                  ${language.party_selection.invalid_selection_third_part}
                `}
              </Typography>
            );
          }
          default: {
            return null;
          }
        }
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
    const { partyTypesAllowed } = appMetadata;
    const partyTypes: string[] = [];

    let returnString: string = '';

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
      } else if (i === (partyTypes.length - 1)) {
        returnString += ` ${language.party_selection.binding_word} ${partyTypes[i]}`;
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
    if (!language) {
      return null;
    }
    return (
      <button
        className={classes.loadMoreButton}
        onClick={increaseNumberOfShownParties}
      >
        <Grid container={true} direction={'row'}>
          <AddIcon className={classes.loadMoreButtonIcon} />
          <Typography className={classes.loadMoreButtonText}>
            {!language.party_selection ?
              'party_selection.load_more' :
              language.party_selection.load_more
            }
          </Typography>
        </Grid>
      </button>
    );
  }

  function toggleShowDeleted() {
    setShowDeleted(!showDeleted);
  }

  function toggleShowSubUnits() {
    setShowSubUnits(!showSubUnits);
  }

  if (!language) {
    return null;
  }

  return (
    <Grid
      container={true}
      direction={'column'}
      className={'container ' + classes.partySelectionPage}
    >
      <Header
        language={language}
        profile={profile}
        type={'normal'}
      />
      <Grid
        container={true}
        direction={'row'}
        style={{
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        <Typography className={classes.partySelectionTitle}>
          {!language.party_selection ?
            'party_selection.header' :
            language.party_selection.header
          }
        </Typography>
        {templateErrorMessage()}
      </Grid>
      <Grid
        container={true}
        direction={'column'}
        className={classes.partySearchFieldContainer}
      >
        <AltinnPartySearch
          onSearchUpdated={onFilterStringChange}
        />
      </Grid>
      <Grid
        container={true}
        direction={'column'}
      >
        <Grid
          container={true}
          justify={'space-between'}
          direction={'row'}
        >
          <Grid item={true}>
            <Typography className={classes.partySelectionSubTitle}>
              {!language.party_selection ?
                'party_selection.subheader' :
                language.party_selection.subheader
              }
            </Typography>
          </Grid>

          <Grid item={true}>
            <Grid container={true} direction={'row'}>
              <Grid item={true} className={classes.partySelectionCheckbox}>
                <Grid container={true} direction={'row'}>
                  <AltinnCheckBox
                    checked={showDeleted}
                    onChangeFunction={toggleShowDeleted}
                  />
                  <Typography
                    className={classes.checkboxLabes}
                  >
                    {
                      !language.party_selection ?
                        'party_selection.show_deleted' :
                        language.party_selection.show_deleted
                    }
                  </Typography>
                </Grid>
              </Grid>
              <Grid
                item={true}
                className={classes.partySelectionCheckbox}
              >
                <Grid container={true} direction={'row'}>
                  <AltinnCheckBox
                    checked={showSubUnits}
                    onChangeFunction={toggleShowSubUnits}
                  />
                  <Typography
                    className={classes.checkboxLabes}
                  >
                    {
                      !language.party_selection ?
                        'party_selection.show_sub_unit' :
                        language.party_selection.show_sub_unit
                    }
                  </Typography>
                </Grid>
              </Grid>
            </Grid>

          </Grid>
        </Grid>
        {renderParties()}
      </Grid>
    </Grid>
  );
}

export default withStyles(styles)(PartySelection);
