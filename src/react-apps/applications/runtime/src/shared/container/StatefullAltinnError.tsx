import { createStyles, withStyles, WithStyles } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { Redirect, RouteProps } from 'react-router-dom';
import AltinnAppTheme from 'Shared/theme/altinnAppTheme';
import { IAltinnWindow, IRuntimeState } from 'src/types';
import { IApplicationMetadata } from '../../shared/resources/applicationMetadata';
import { changeBodyBackground } from '../../utils/bodyStyling';
import AltinnAppHeader from '../components/altinnAppHeader';
import AltinnError from '../components/altinnError';

const styles = createStyles({
  statefulErrorPage: {
    backgroundColor: AltinnAppTheme.altinnPalette.primary.white,
    width: '100%',
    height: '100%',
    maxWidth: '780px',
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'center',
    padding: 12,
  },
  statefulErrorContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'space-between',
  },
});

export interface IStateFullAltinnError extends RouteProps, WithStyles<typeof styles> {
}

export interface IRedirectErrorState {
  message: string;
}

function StatefulAltinnError(props: IStateFullAltinnError) {
  const { classes } = props;

  const language = useSelector((state: IRuntimeState) => state.language.language);
  const profile = useSelector((state: IRuntimeState) => state.profile.profile);
  const appMetadata: IApplicationMetadata = useSelector((state: IRuntimeState) =>
    state.applicationMetadata.applicationMetadata);

  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.white);

  function templateErrorMessageContent(): React.ReactNode {
    const { instantiate } = language;
    return (
      <>
        {`${instantiate.party_selection_error_no_valid_selection_second_part} ${(window as IAltinnWindow).service}. `}
        {`${instantiate.party_selection_error_no_valid_selection_third_part} ${templatePartyTypeString()}.`}
        <br />
        <br />
        <a href={'https://altinn.no/help/profil/roller-og-rettigheter/'}>
          {`${instantiate.party_selection_error_read_more_roles_link}`}
        </a>
        {`. ${instantiate.party_selection_error_contact_support}`}
      </>
    );
  }

  function templateErrorMessageTitle(): string {
    const { instantiate } = language;
    return `${instantiate.party_selection_error_no_valid_selection_first_part} ${templatePartyTypeString()}`;
  }

  function templatePartyTypeString(): string {
    let returnString: string = '';
    const partyTypes: string[] = [];

    const { partyTypesAllowed } = appMetadata;

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

  if (!props.location || !props.location.state || !props.location.state.message) {
    return (
      <Redirect to={'/'}/>
    );
  } else {
    return (
      <div className={'container'}>
        <AltinnAppHeader
          language={language}
          profile={profile}
          type={'normal'}
        />
        <Grid container={true} className={classes.statefulErrorPage}>
          <Grid item={true}>
            <AltinnError
              title={templateErrorMessageTitle()}
              content={templateErrorMessageContent()}
              statusCode={`${language.instantiate.party_selection_error_caption_prefix} 403`}
            />
          </Grid>
        </Grid>
      </div>
    );
  }
}

export default withStyles(styles)(StatefulAltinnError);

/*
party_selection_error_no_valid_selection_first_part: "Dette er en tjeneste for"
party_selection_error_no_valid_selection_second_part:
  "Det ser ut som du ikke har tilgang til en aktør som har lov til å starte"
party_selection_error_no_valid_selection_third_part:
  "For å starte denne tjenesten må du ha tilganger som knytter deg til en"
*/
