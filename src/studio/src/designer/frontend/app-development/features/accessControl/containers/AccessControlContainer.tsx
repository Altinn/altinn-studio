import { createMuiTheme, Typography, makeStyles } from '@material-ui/core';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AltinnCheckBoxGroup from 'app-shared/components/AltinnCheckBoxGroup';
import AltinnColumnLayout from 'app-shared/components/AltinnColumnLayout';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import { getLanguageFromKey } from 'app-shared/utils/language';
import VersionControlHeader from 'app-shared/version-control/versionControlHeader';
import { ApplicationMetadataActions } from '../../../sharedResources/applicationMetadata/applicationMetadataSlice';
// eslint-disable-next-line import/no-cycle
import { PartyTypeComponent } from '../components/PartyTypeComponent';

const theme = createMuiTheme(altinnTheme);

const useStyles = makeStyles({
  sectionHeader: {
    marginBottom: 12,
    fontSize: 20,
    fontWeight: 500,
  },
  sectionContent: {
    fontSize: 16,
    marginBottom: 24,
  },
  sidebarHeader: {
    marginBottom: 20,
    fontSize: 20,
    fontWeight: 500,
  },
  infoText: {
    fontSize: 16,
  },
  informationPaperText: {
    fontSize: 16,
  },
  informationPaper: {
    padding: 12,
  },
  sidebarSectionHeader: {
    fontSize: 16,
    fontWeight: 500,
  },
  sidebarSectionContainer: {
    '&:not(:last-child)': {
      marginBottom: 24,
    },
  },
  contentMargin: {
    marginBottom: 24,
  },
  versionControlHeaderMargin: {
    marginLeft: 60,
  },
  [theme.breakpoints.up('md')]: {
    versionControlHeaderMargin: {
      marginLeft: theme.sharedStyles.leftDrawerMenuClosedWidth + 60,
    },
  },
});

export interface IAccessControlContainerProvidedProps {
  classes: any;
  dispatch?: any;
  applicationMetadata: any;
}

export interface IAccessControlContainerProps extends IAccessControlContainerProvidedProps {
  language: any;
}

export interface IAccessControlContainerState {
  partyTypesAllowed: IPartyTypesAllowed;
}

export interface IPartyTypesAllowed {
  bankruptcyEstate: boolean;
  organisation: boolean;
  person: boolean;
  subUnit: boolean;
}

// eslint-disable-next-line no-shadow
export enum PartyTypes {
  bankruptcyEstate = 'bankruptcyEstate',
  organisation = 'organisation',
  person = 'person',
  subUnit = 'subUnit',
}

function reducer(state: IPartyTypesAllowed, action: any) {
  console.log('change stuff up!', action.type);
  switch (action.type) {
    case PartyTypes.bankruptcyEstate: {
      return {
        ...state,
        bankruptcyEstate: !state.bankruptcyEstate,
      };
    }
    case PartyTypes.organisation: {
      return {
        ...state,
        organisation: !state.organisation,
      };
    }
    case PartyTypes.person: {
      return {
        ...state,
        person: !state.person,
      };
    }
    case PartyTypes.subUnit: {
      return {
        ...state,
        subUnit: !state.subUnit,
      };
    }
    default: {
      throw new Error();
    }
  }
}

const initialPartyTypesAllowed: IPartyTypesAllowed = {
  bankruptcyEstate: false,
  organisation: false,
  person: false,
  subUnit: false,
};

export default function AccessControlContainer(props: IAccessControlContainerProvidedProps) {
  const classes = useStyles();
  const dispatch = useDispatch();

  const [partyTypesAllowed, setPartyTypesAllowed] = React.useReducer(reducer, initialPartyTypesAllowed);

  // const applicationMetadata = useSelector(
  //   (state: IServiceDevelopmentState) => state.applicationMetadataState.applicationMetadata,
  // );
  const language = useSelector((state: IServiceDevelopmentState) => state.language);

  React.useEffect(() => {
    dispatch(ApplicationMetadataActions.getApplicationMetadata());
  }, []);

  // React.useEffect(() => {
  //   if (props.applicationMetadata) {
  //     const updatedPartyTypes = props.applicationMetadata.partyTypesAllowed;
  //     if (updatedPartyTypes && partyTypesAllowed !== updatedPartyTypes) {
  //       setPartyTypesAllowed(updatedPartyTypes);
  //     }
  //   } else {
  //     setPartyTypesAllowed({
  //       bankruptcyEstate: false,
  //       organisation: false,
  //       person: false,
  //       subUnit: false,
  //     });
  //   }
  // }, [props.applicationMetadata]);

  const handlePartyTypesAllowedChange = (partyType: PartyTypes) => {
    const newValue = !partyTypesAllowed[partyType];
    console.log('party type ', partyType, 'newValue: ', newValue);
    setPartyTypesAllowed({ type: partyType });
    console.log('partyTypesAllowed: ', partyTypesAllowed);
    // saveApplicationMetadata();
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const saveApplicationMetadata = () => {
  //   // tslint:disable-next-line: max-line-length
  //   const newApplicationMetadata =
  //     JSON.parse(JSON.stringify((applicationMetadata || {})));
  //   newApplicationMetadata.partyTypesAllowed = partyTypesAllowed;
  //   console.log('partytypesallowed: ', partyTypesAllowed);
  //   dispatch(ApplicationMetadataActions.putApplicationMetadata({
  //     applicationMetadata: newApplicationMetadata,
  //   }));
  // };

  const RenderMainContent = (): JSX.Element => {
    return (
      <>
        <RenderPartySection />
      </>
    );
  };

  const RenderPartySection = (): JSX.Element => {
    const partyTypeKeys = Object.keys(PartyTypes);
    return (
      <div className={classes.contentMargin}>
        <Typography className={classes.sectionHeader}>
          {getLanguageFromKey('access_control.party_type_header', language)}
        </Typography>
        <Typography className={classes.sectionContent}>
          {getLanguageFromKey('access_control.party_type', language)}
        </Typography>
        <AltinnCheckBoxGroup row={true}>
          {partyTypeKeys.map((partyTypeKey: string) => {
            // value used for mapping internal state, key used for language reference
            const partyTypeValue = PartyTypes[partyTypeKey as PartyTypes] as keyof IPartyTypesAllowed;
            return (
              <PartyTypeComponent
                key={partyTypeKey}
                partyTypeKey={partyTypeKey}
                partyTypeValue={partyTypeValue}
                handlePartyTypesAllowedChange={handlePartyTypesAllowedChange}
                label={getLanguageFromKey(`access_control.${partyTypeKey}`, language)}
              />);
          })}
        </AltinnCheckBoxGroup>
      </div>
    );
  };

  const RenderSideMenu = (): JSX.Element => {
    return (
      <>
        <Typography className={classes.sidebarHeader}>
          {getLanguageFromKey('access_control.about_header', language)}
        </Typography>
        <div className={classes.sidebarSectionContainer}>
          <Typography className={classes.sidebarSectionHeader}>
            {getLanguageFromKey('access_control.test_initiation_header', language)}
          </Typography>
          <Typography className={classes.infoText}>
            {getLanguageFromKey('access_control.test_initiation', language)}
          </Typography>
        </div>
        <div className={classes.sidebarSectionContainer}>
          <Typography className={classes.sidebarSectionHeader}>
            {getLanguageFromKey('access_control.test_what_header', language)}
          </Typography>
          <Typography className={classes.infoText}>
            {getLanguageFromKey('access_control.test_what', language)}
          </Typography>
        </div>
      </>
    );
  };

  return (
    <AltinnColumnLayout
      aboveColumnChildren={
        <div className={classes.versionControlHeaderMargin}>
          <VersionControlHeader language={language} />
        </div>}
      sideMenuChildren={<RenderSideMenu />}
      header={getLanguageFromKey('access_control.header', language)}
    >
      <RenderMainContent />
    </AltinnColumnLayout>
  );
}
