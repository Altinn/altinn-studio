import { createMuiTheme, createStyles, Paper, Typography, withStyles } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import AltinnCheckBox from '../../../../../shared/src/components/AltinnCheckBox';
import AltinnCheckBoxGroup from '../../../../../shared/src/components/AltinnCheckBoxGroup';
import AltinnColumnLayout from '../../../../../shared/src/components/AltinnColumnLayout';
import AltinnFormControlLabel from '../../../../../shared/src/components/AltinnFormControlLabel';
import AltinnInputField from '../../../../../shared/src/components/AltinnInputField';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import VersionControlHeader from '../../../../../shared/src/version-control/versionControlHeader';
import applicationMetadataDispatcher from '../../../sharedResources/applicationMetadata/applicationMetadataDispatcher';
import { makeGetApplicationMetadata } from '../../../sharedResources/applicationMetadata/selectors/applicationMetadataSelector';

const theme = createMuiTheme(altinnTheme);

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
}

export interface IAccessControlContainerProps extends IAccessControlContainerProvidedProps {
  language: any;
}

export interface IAccessControlContainerState {
  partyTypesAllowed: IPartyTypesAllowed;
  subscriptionHook: {
    serviceCode: string,
    editionCode: string,
  };
  showSubscriptionHook: boolean;
}

export interface IPartyTypesAllowed {
  bankruptcyEstate: boolean;
  organisation: boolean;
  person: boolean;
  subUnit: boolean;
}

export enum PartyTypes {
  bankruptcyEstate = 'bankruptcyEstate',
  organisation = 'organisation',
  person = 'person',
  subUnit = 'subUnit',
}

export class AccessControlContainerClass extends React.Component<
  IAccessControlContainerProps, IAccessControlContainerState> {

  public static getDerivedStateFromProps(nextProps: IAccessControlContainerProps, state: IAccessControlContainerState) {
    const {subscriptionHook, partyTypesAllowed} = nextProps.applicationMetadata;
    if (!subscriptionHook || !partyTypesAllowed) {
      return null;
    }
    if (state.subscriptionHook !== subscriptionHook || state.partyTypesAllowed !== partyTypesAllowed) {
      return {
        partyTypesAllowed,
        subscriptionHook,
        // tslint:disable-next-line: max-line-length
        showSubscriptionHook: (subscriptionHook.serviceCode || subscriptionHook.editionCode) || state.showSubscriptionHook,
      };
    }
    return null;
  }

  constructor(props: IAccessControlContainerProps, state: IAccessControlContainerState) {
    super(props, state);
    let { partyTypesAllowed, subscriptionHook} = props.applicationMetadata;
    if (!partyTypesAllowed) {
      partyTypesAllowed = {
        bankruptcyEstate: false,
        organisation: false,
        person: false,
        subUnit: false,
      };
    }
    if (!subscriptionHook) {
      subscriptionHook =  {
        serviceCode: '',
        editionCode: '',
      };
    }
    this.state = {
      partyTypesAllowed,
      subscriptionHook,
      showSubscriptionHook: (subscriptionHook.serviceCode || subscriptionHook.editionCode),
    };
    this.handleSubscriptionHookValuesOnBlur = this.handleSubscriptionHookValuesOnBlur.bind(this);
  }

  public render() {
    return (
      <AltinnColumnLayout
        aboveColumnChildren={
          <div className={this.props.classes.versionControlHeaderMargin}>
            <VersionControlHeader language={this.props.language} />
          </div>}
        children={this.renderMainContent()}
        sideMenuChildren={this.renderSideMenu()}
        header={getLanguageFromKey('access_control.header', this.props.language)}
      />
    );
  }

  public renderMainContent = (): JSX.Element => {
    return (
      <>
        {this.renderPartySection()}
        {this.renderHooksSection()}
      </>
    );
  }

  public renderHooksSection = (): JSX.Element => {
    const { serviceCode, editionCode } = this.state.subscriptionHook;
    const { classes } = this.props;
    return (
      <>
        <Typography className={this.props.classes.sectionHeader}>
          {getLanguageFromKey('access_control.hooks_header', this.props.language)}
        </Typography>
        <div className={classes.contentMargin}>
          <AltinnFormControlLabel
            control={<AltinnCheckBox
              checked={this.state.showSubscriptionHook}
              onChangeFunction={this.handleSubscriptionHookChange.bind(this)}
            />}
            label={getLanguageFromKey('access_control.hooks', this.props.language)}
          />
        </div>
        {this.state.showSubscriptionHook &&
          <>
            <div className={classes.contentMargin}>
              <AltinnInputField
                id='service-code'
                inputHeader={getLanguageFromKey('access_control.service_code', this.props.language)}
                inputValue={serviceCode}
                inputHeaderStyling={{ fontSize: 16, fontWeight: 500 }}
                onChangeFunction={this.handleSubscriptionHookValuesChanged.bind(this, 'serviceCode')}
                onBlurFunction={this.handleSubscriptionHookValuesOnBlur}
                inputFieldStyling={{ width: '96px', backgroundColor: 'white' }}
              />
            </div>
            <div className={classes.contentMargin}>
              <AltinnInputField
                id='edition-code'
                inputHeader={getLanguageFromKey('access_control.edition_code', this.props.language)}
                inputValue={editionCode}
                inputHeaderStyling={{ fontSize: 16, fontWeight: 500 }}
                onChangeFunction={this.handleSubscriptionHookValuesChanged.bind(this, 'editionCode')}
                onBlurFunction={this.handleSubscriptionHookValuesOnBlur}
                inputFieldStyling={{ width: '96px', backgroundColor: 'white' }}
              />
            </div>
            <div className={classes.contentMargin}>
              <Paper elevation={1} square={true} className={classes.informationPaper}>
                <Typography className={classes.informationPaperText}>
                  {getLanguageFromKey('access_control.subscription_text_helper', this.props.language)}
                </Typography>
              </Paper>
            </div>
          </>
        }
      </>
    );
  }

  public handleSubscriptionHookChange() {
    const newState = Object.assign(this.state) as IAccessControlContainerState;
    newState.showSubscriptionHook = !newState.showSubscriptionHook;
    if (!newState.showSubscriptionHook) {
      newState.subscriptionHook.serviceCode = '';
      newState.subscriptionHook.editionCode = '';
    }
    this.setState(newState, () => {
      this.saveApplicationMetadata();
    });
  }

  public handleSubscriptionHookValuesChanged(type: string, event: any) {
    const value = event.target.value;
    const newState = Object.assign(this.state) as IAccessControlContainerState;
    if (type === 'serviceCode') {
      newState.subscriptionHook.serviceCode = value;
    } else {
      newState.subscriptionHook.editionCode = value;
    }
    this.setState(newState);
  }

  public handleSubscriptionHookValuesOnBlur() {
    this.saveApplicationMetadata();
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
          {partyTypeKeys.map((partyTypeKey: string, index: number) => {
            // value used for mapping internal state, key used for language reference
            const partyTypeValue = PartyTypes[partyTypeKey as PartyTypes] as keyof IPartyTypesAllowed;
            return (
              <AltinnFormControlLabel
                key={partyTypeKey}
                control={<AltinnCheckBox
                  checked={this.state.partyTypesAllowed[partyTypeValue]}
                  onChangeFunction={this.handlePartyTypesAllowedChange.bind(this, partyTypeValue)}
                />}
                label={getLanguageFromKey('access_control.' + partyTypeKey, this.props.language)}
              />);
          })}
        </AltinnCheckBoxGroup>
      </div>
    );
  }

  public handlePartyTypesAllowedChange(partyType: PartyTypes) {
    const { partyTypesAllowed } = this.state;
    partyTypesAllowed[partyType] = !partyTypesAllowed[partyType];
    this.setState({
      partyTypesAllowed,
    }, () => {
      this.saveApplicationMetadata();
    });
  }

  public saveApplicationMetadata() {
    // tslint:disable-next-line: max-line-length
    const newApplicationMetadata = JSON.parse(JSON.stringify((this.props.applicationMetadata ? this.props.applicationMetadata : {})));
    newApplicationMetadata.partyTypesAllowed = this.state.partyTypesAllowed;
    newApplicationMetadata.subscriptionHook = this.state.subscriptionHook;
    applicationMetadataDispatcher.putApplicationMetadata(newApplicationMetadata);
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
}

const makeMapStateToProps = () => {
  const getApplicationMetadata = makeGetApplicationMetadata();
  const mapStateToProps = (
    state: IServiceDevelopmentState,
    props: IAccessControlContainerProvidedProps,
  ): IAccessControlContainerProps => {
    return {
      language: state.language.language,
      applicationMetadata: getApplicationMetadata(state),
      ...props,
    };
  };
  return mapStateToProps;
};

export default withStyles(styles)(connect(makeMapStateToProps)(AccessControlContainerClass));
