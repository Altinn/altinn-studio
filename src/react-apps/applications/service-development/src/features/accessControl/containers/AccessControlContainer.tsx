import { createStyles, Paper, Typography, withStyles } from '@material-ui/core';
import axios from 'axios';
import * as React from 'react';
import { connect } from 'react-redux';
import AltinnCheckBox from '../../../../../shared/src/components/AltinnCheckBox';
import AltinnCheckBoxGroup from '../../../../../shared/src/components/AltinnCheckBoxGroup';
import AltinnColumnLayout from '../../../../../shared/src/components/AltinnColumnLayout';
import AltinnFormControlLabel from '../../../../../shared/src/components/AltinnFormControlLabel';
import AltinnInputField from '../../../../../shared/src/components/AltinnInputField';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import VersionControlHeader from '../../../../../shared/src/version-control/versionControlHeader';

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
    margin: 12,
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
});

export interface IAccessControlContainerProvidedProps {
  classes: any;
}

export interface IAccessControlContainerProps extends IAccessControlContainerProvidedProps {
  language: any;
}

export interface IAccessControlContainerState {
  partyTypeAllowed: {
    bankruptcyEstate: boolean,
    organization: boolean,
    person: boolean,
    subUnit: boolean,
  };
  hooks: {
    subscriptionHook: {
      active: boolean,
      serviceCode: string,
      editionCode: string,
    },
  };
}

export enum PartyTypes {
  bankruptcy_estate = 'bankruptcyEstate',
  organization = 'organization',
  person = 'person',
  sub_unit = 'subUnit',
}

export class AccessControlContainerClass extends React.Component<
  IAccessControlContainerProps, IAccessControlContainerState> {

  public cancelToken = axios.CancelToken;
  public source = this.cancelToken.source();

  constructor(props: IAccessControlContainerProps, state: IAccessControlContainerState) {
    super(props, state);
    this.state = {
      partyTypeAllowed: {
        bankruptcyEstate: false,
        organization: false,
        person: false,
        subUnit: false,
      },
      hooks: {
        subscriptionHook: {
          active: false,
          serviceCode: '',
          editionCode: '',
        },
      },
    };
    this.handleSubscriptionHookValuesOnBlur = this.handleSubscriptionHookValuesOnBlur.bind(this);
  }

  public componentWillUnmount: () => void = () => {
    this.source.cancel('ComponentWillUnmount');
  }

  public render() {
    return (
      <AltinnColumnLayout
        aboveColumnChildren={<VersionControlHeader language={this.props.language} />}
        children={this.renderMainContent()}
        sideMenuChildren={this.renderSideMenu()}
        header={getLanguageFromKey('access_control.header', this.props.language)}
      />
    );
  }

  public renderMainContent = (): JSX.Element => {
    return (
      <>
        {this.renderHooksSection()}
        {this.renderPartySection()}
      </>
    );
  }

  public renderHooksSection = (): JSX.Element => {
    const { serviceCode, editionCode } = this.state.hooks.subscriptionHook;
    const { classes } = this.props;
    return (
      <>
        <Typography className={this.props.classes.sectionHeader}>
          {getLanguageFromKey('access_control.hooks_header', this.props.language)}
        </Typography>
        <div className={classes.contentMargin}>
          <AltinnFormControlLabel
            control={<AltinnCheckBox
              checked={this.state.hooks.subscriptionHook.active}
              onChangeFunction={this.handleSubscriptionHookChange.bind(this)}
            />}
            label={getLanguageFromKey('access_control.hooks', this.props.language)}
          />
        </div>
        {this.state.hooks.subscriptionHook.active &&
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
              <Paper elevation={1} square={true}>
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
    newState.hooks.subscriptionHook.active = !newState.hooks.subscriptionHook.active;
    if (!newState.hooks.subscriptionHook.active) {
      newState.hooks.subscriptionHook.serviceCode = '';
      newState.hooks.subscriptionHook.editionCode = '';
    }
    this.setState(newState);
  }

  public handleSubscriptionHookValuesChanged(type: string, event: any) {
    const value = event.target.value;
    const newState = Object.assign(this.state) as IAccessControlContainerState;
    if (type === 'serviceCode') {
      newState.hooks.subscriptionHook.serviceCode = value;
    } else {
      newState.hooks.subscriptionHook.editionCode = value;
    }
    this.setState(newState);
  }

  public handleSubscriptionHookValuesOnBlur() {
    this.saveApplicationMetadata();
  }

  public renderPartySection = (): JSX.Element => {
    const partyTypeKeys = Object.keys(PartyTypes);
    return (
      <>
        <Typography className={this.props.classes.sectionHeader}>
          {getLanguageFromKey('access_control.party_type_header', this.props.language)}
        </Typography>
        <Typography className={this.props.classes.sectionContent}>
          {getLanguageFromKey('access_control.party_type', this.props.language)}
        </Typography>
        <AltinnCheckBoxGroup row={true}>
          {partyTypeKeys.map((key: string) => {
            return (
              <AltinnFormControlLabel
                key={key}
                control={<AltinnCheckBox
                  checked={this.state.partyTypeAllowed[key as PartyTypes]}
                  onChangeFunction={this.handlePartyTypeAllowedChange.bind(this, key as PartyTypes)}
                />}
                label={getLanguageFromKey('access_control.' + key, this.props.language)}
              />);
          })}
        </AltinnCheckBoxGroup>
      </>
    );
  }

  public handlePartyTypeAllowedChange(partyType: PartyTypes) {
    const { partyTypeAllowed } = this.state;
    partyTypeAllowed[partyType] = !partyTypeAllowed[partyType];
    this.setState({
      partyTypeAllowed,
    }, () => {
      this.saveApplicationMetadata();
    });
  }

  public saveApplicationMetadata() {
    // TODO: Actually save
    console.log('Save application data', JSON.stringify(this.state));
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

const mapStateToProps = (
  state: IServiceDevelopmentState,
  props: IAccessControlContainerProvidedProps,
): IAccessControlContainerProps => {
  return {
    language: state.language.language,
    ...props,
  };
};

export default withStyles(styles)(connect(mapStateToProps)(AccessControlContainerClass));
