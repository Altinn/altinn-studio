import { createStyles, Grid, Paper, Typography, withStyles, WithStyles } from '@material-ui/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import AltinnButton from 'Shared/components/AltinnButton';
import AltinnAppTheme from 'Shared/theme/altinnAppTheme';
import { IAltinnWindow, IRuntimeState } from 'src/types';
import Header from '../../../shared/components/altinnAppHeader';
import AltinnParty from '../../../shared/components/altinnParty';
import AltinnPartySearch from '../../../shared/components/altinnPartySearch';
import LanguageActions from '../../../shared/resources/language/languageActions';
import { IParty } from '../../../shared/resources/party';
import PartyActions from '../../../shared/resources/party/partyActions';
import ProfileActions from '../../../shared/resources/profile/profileActions';

const styles = createStyles({
  partySelectionPage: {
    backgroundColor: AltinnAppTheme.altinnPalette.primary.white,
    width: '100%',
    height: '100%',
    maxWidth: '780px',
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'center',
    padding: 12,
  },
});

export interface IPartySelectionProps extends WithStyles<typeof styles> {

}

function PartySelection(props: IPartySelectionProps) {
  const language = useSelector((state: IRuntimeState) => state.language.language);
  const profile = useSelector((state: IRuntimeState) => state.profile.profile);
  const parties = useSelector((state: IRuntimeState) => state.party.parties);

  const [filterString, setFilterString] = React.useState('');
  const [numberOfPartiesShown, setNumberOfPartiesShown] = React.useState(4);

  const { classes } = props;

  React.useEffect(() => {
    const {org, service} = window as IAltinnWindow;
    PartyActions.getParties(`${window.location.origin}/${org}/${service}/api/v1/parties`);
    if (!profile) {
      ProfileActions.fetchProfile(
        `${window.location.origin}/${org}/${service}/api/v1/profile/user`,
      );
    }
    if (!language) {
      LanguageActions.fetchLanguage(
        `${window.location.origin}/${org}/${service}/api/Language/GetLanguageAsJSON`,
        'nb',
      );
    }
  }, []);

  function renderParties() {
    if (!parties || !profile) {
      return null;
    }
    // Set the current selected party first in the array and concat rest (without the current)
    const currentParty: IParty = parties.find((party) => party.partyId === profile.partyId);
    const partiesElements = [currentParty].concat(
      parties.map(
        (party) => party.partyId !== currentParty.partyId ? party : null,
      ).filter(
          (party) => party != null,
        ),
    );
    return (
      <>
        {partiesElements.map((party: IParty, index: number) =>
          index < numberOfPartiesShown ?
            party.name.toUpperCase().includes(filterString.toUpperCase()) ?
              <AltinnParty
                key={index}
                party={party}
                isCurrent={party.partyId === currentParty.partyId}
              />
              : null
            : null,
          )}
      </>
    );
  }

  function onFilterStringChange(filterStr: string) {
    setFilterString(filterStr);
  }

  function increaseNumberOfShownParties() {
    setNumberOfPartiesShown(numberOfPartiesShown + 4);
  }

  function renderShowMoreButton() {
    if (!parties || numberOfPartiesShown >= parties.length) {
      return null;
    }
    return (
      <AltinnButton
        onClickFunction={increaseNumberOfShownParties}
        btnText={'Last flere'}
      />
    );
  }

  return (
    <>
      <Header
        language={language}
        profile={profile}
      />
      <Paper className={classes.partySelectionPage}>
        <Grid container={true}>
          <Typography variant='h2'>
            Hvem vil du sende inn for?
          </Typography>
        </Grid>
        <Grid container={true}>
          <AltinnPartySearch
            onSearchUpdated={onFilterStringChange}
          />
        </Grid>
        <Grid container={true}>
          <Typography variant='headline'>
            Dine aktører som kan starte tjenesten:
          </Typography>
          {renderParties()}
        </Grid>
        <Grid container={true}>
          {renderShowMoreButton()}
        </Grid>
      </Paper>
    </>
  );
}

export default withStyles(styles)(PartySelection);
