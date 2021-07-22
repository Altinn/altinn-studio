import { createTheme, createStyles, Typography, withStyles } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import AltinnCheckBox from 'app-shared/components/AltinnCheckBox';
import AltinnCheckBoxGroup from 'app-shared/components/AltinnCheckBoxGroup';
import AltinnColumnLayout from 'app-shared/components/AltinnColumnLayout';
import AltinnFormControlLabel from 'app-shared/components/AltinnFormControlLabel';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import { getLanguageFromKey } from 'app-shared/utils/language';
import VersionControlHeader from 'app-shared/version-control/versionControlHeader';
import { ApplicationMetadataActions } from '../../../sharedResources/applicationMetadata/applicationMetadataSlice';
import { makeGetApplicationMetadata } from '../../../sharedResources/applicationMetadata/selectors/applicationMetadataSelector';

const theme = createTheme(altinnTheme);

const styles = createStyles({
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
  applicationMetadata: any;
  dispatch?: Dispatch;
}

export interface IAccessControlContainerProps extends IAccessControlContainerProvidedProps {
  language: any;
}

export interface IAccessControlContainerState {
  partyTypesAllowed: IPartyTypesAllowed;
  setStateCalled: boolean;
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

export class AccessControlContainerClass extends React.Component<
  IAccessControlContainerProps, IAccessControlContainerState> {
  public static getDerivedStateFromProps(nextProps: IAccessControlContainerProps, state: IAccessControlContainerState) {
    if (state.setStateCalled) {
      return {
        ...state,
        setStateCalled: false,
      };
    }

    const { partyTypesAllowed } = nextProps.applicationMetadata;
    if (!partyTypesAllowed) {
      return null;
    }
    if (state.partyTypesAllowed !== partyTypesAllowed) {
      return {
        partyTypesAllowed,
        // tslint:disable-next-line: max-line-length
      };
    }
    return null;
  }

  constructor(props: IAccessControlContainerProps, state: IAccessControlContainerState) {
    super(props, state);
    const { partyTypesAllowedProps } = props.applicationMetadata;
    const partyTypesAllowed = {
      bankruptcyEstate: !!partyTypesAllowedProps?.bankruptcyEstate,
      organisation: !!partyTypesAllowedProps?.organisation,
      person: !!partyTypesAllowedProps?.person,
      subUnit: !!partyTypesAllowedProps?.subUnit,
    };

    this.state = {
      partyTypesAllowed,
      setStateCalled: false,
    };
  }

  public componentDidMount() {
    this.props.dispatch(ApplicationMetadataActions.getApplicationMetadata());
  }

  public handlePartyTypesAllowedChange(partyType: PartyTypes) {
    this.setState((prev) => {
      const partyTypesAllowed = { ...prev.partyTypesAllowed };
      partyTypesAllowed[partyType] = !partyTypesAllowed[partyType];
      return ({
        partyTypesAllowed,
        setStateCalled: true,
      });
    }, () => {
      this.saveApplicationMetadata();
    });
  }

  public saveApplicationMetadata() {
    const newApplicationMetadata =
      JSON.parse(JSON.stringify((this.props.applicationMetadata ? this.props.applicationMetadata : {})));
    newApplicationMetadata.partyTypesAllowed = this.state.partyTypesAllowed;
    this.props.dispatch(
      ApplicationMetadataActions.putApplicationMetadata({ applicationMetadata: newApplicationMetadata }),
    );
  }

  public renderMainContent = (): JSX.Element => {
    return (
      <>
        {this.renderPartySection()}
      </>
    );
  }

  public renderPartySection = (): JSX.Element => {
    const partyTypeKeys = Object.keys(PartyTypes);
    return (
      <div className={this.props.classes.contentMargin}>
        <Typography className={this.props.classes.sectionHeader}>
          {getLanguageFromKey('access_control.party_type_header', this.props.language)}
        </Typography>
        <Typography className={this.props.classes.sectionContent}>
          {getLanguageFromKey('access_control.party_type', this.props.language)}
        </Typography>
        <AltinnCheckBoxGroup row={true}>
          {partyTypeKeys.map((partyTypeKey: string) => {
            // value used for mapping internal state, key used for language reference
            const partyTypeValue = PartyTypes[partyTypeKey as PartyTypes] as keyof IPartyTypesAllowed;
            return (
              <AltinnFormControlLabel
                key={partyTypeKey}
                control={<AltinnCheckBox
                  checked={this.state.partyTypesAllowed[partyTypeValue]}
                  // eslint-disable-next-line react/jsx-no-bind
                  onChangeFunction={this.handlePartyTypesAllowedChange.bind(this, partyTypeValue)}
                />}
                label={getLanguageFromKey(`access_control.${partyTypeKey}`, this.props.language)}
              />);
          })}
        </AltinnCheckBoxGroup>
      </div>
    );
  }

  public renderSideMenu = (): JSX.Element => {
    return (
      <>
        <Typography className={this.props.classes.sidebarHeader}>
          {getLanguageFromKey('access_control.about_header', this.props.language)}
        </Typography>
        <div className={this.props.classes.sidebarSectionContainer}>
          <Typography className={this.props.classes.sidebarSectionHeader}>
            {getLanguageFromKey('access_control.test_initiation_header', this.props.language)}
          </Typography>
          <Typography className={this.props.classes.infoText}>
            {getLanguageFromKey('access_control.test_initiation', this.props.language)}
          </Typography>
        </div>
        <div className={this.props.classes.sidebarSectionContainer}>
          <Typography className={this.props.classes.sidebarSectionHeader}>
            {getLanguageFromKey('access_control.test_what_header', this.props.language)}
          </Typography>
          <Typography className={this.props.classes.infoText}>
            {getLanguageFromKey('access_control.test_what', this.props.language)}
          </Typography>
        </div>
      </>
    );
  }

  public render() {
    return (
      <AltinnColumnLayout
        aboveColumnChildren={
          <div className={this.props.classes.versionControlHeaderMargin}>
            <VersionControlHeader language={this.props.language} />
          </div>}
        sideMenuChildren={this.renderSideMenu()}
        header={getLanguageFromKey('access_control.header', this.props.language)}
      >
        {this.renderMainContent()}
      </AltinnColumnLayout>
    );
  }
}

const makeMapStateToProps = () => {
  const getApplicationMetadata = makeGetApplicationMetadata();
  return (
    state: IServiceDevelopmentState,
    props: IAccessControlContainerProvidedProps,
  ): IAccessControlContainerProps => ({
    language: state.languageState.language,
    applicationMetadata: getApplicationMetadata(state),
    dispatch: props.dispatch,
    ...props,
  });
};

export default withStyles(styles)(connect(makeMapStateToProps)(AccessControlContainerClass));
