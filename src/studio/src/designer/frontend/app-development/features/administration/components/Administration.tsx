
import { createMuiTheme, createStyles, Grid, Typography, withStyles } from '@material-ui/core';
import classNames = require('classnames');
import * as React from 'react';
import { connect } from 'react-redux';
import AltinnColumnLayout from 'app-shared/components/AltinnColumnLayout';
import AltinnInputField from 'app-shared/components/AltinnInputField';
import AltinnPopper from 'app-shared/components/AltinnPopper';
import AltinnSpinner from 'app-shared/components/AltinnSpinner';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import { formatNameAndDate } from 'app-shared/utils/formatDate';
import { getLanguageFromKey } from 'app-shared/utils/language';
import VersionControlHeader from 'app-shared/version-control/versionControlHeader';
import { ICommit, IRepository } from '../../../types/global';
import handleServiceInformationActionDispatchers from '../handleServiceInformationDispatcher';
export interface IAdministrationComponentProvidedProps {
  classes: any;
}

export interface IAdministrationComponentProps extends IAdministrationComponentProvidedProps {
  initialCommit: ICommit;
  language: any;
  service: IRepository;
  serviceDescription: string;
  serviceDescriptionIsSaving: boolean;
  serviceId: string;
  serviceIdIsSaving: boolean;
  serviceName: string;
  serviceNameIsSaving: boolean;
}

export interface IAdministrationComponentState {
  editServiceDescription: boolean;
  editServiceId: boolean;
  editServiceName: boolean;
  serviceDescription: string;
  serviceId: string;
  serviceName: string;
  serviceNameAnchorEl: any;
}

const theme = createMuiTheme(altinnTheme);

const styles = createStyles({
  avatar: {
    maxHeight: '2em',
  },
  sidebarHeader: {
    marginBottom: 20,
    fontSize: 20,
    fontWeight: 500,
  },
  sidebarInfoText: {
    fontSize: 16,
  },
  iconStyling: {
    fontSize: 35,
    textAlign: 'right' as 'right',
  },
  sidebarServiceOwner: {
    marginTop: 10,
  },
  sidebarCreatedBy: {
    fontSize: 16,
    marginTop: 10,
  },
  spinnerLocation: {
    margin: 'auto',
  },
  marginBottom_24: {
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

export class AdministrationComponent extends
  React.Component<IAdministrationComponentProps, IAdministrationComponentState> {
  public static getDerivedStateFromProps(_props: IAdministrationComponentProps, _state: IAdministrationComponentState) {
    if (_state.editServiceName || _props.serviceNameIsSaving) {
      return {
        serviceDescription: _props.serviceDescription,
        serviceId: _props.serviceId,
        serviceName: _state.serviceName,
      };
    }
    if (_state.editServiceDescription || _props.serviceDescriptionIsSaving) {
      return {
        serviceDescription: _state.serviceDescription,
        serviceId: _props.serviceId,
        serviceName: _props.serviceName,
      };
    }
    if (_state.editServiceId || _props.serviceIdIsSaving) {
      return {
        serviceDescription: _props.serviceDescription,
        serviceId: _state.serviceId,
        serviceName: _props.serviceName,
      };
    }
    return {
      serviceDescription: _props.serviceDescription,
      serviceId: _props.serviceId,
      serviceName: _props.serviceName,
    };
  }

  public state: IAdministrationComponentState = {
    editServiceDescription: false,
    editServiceId: false,
    editServiceName: false,
    serviceDescription: '',
    serviceId: '',
    serviceName: this.props.serviceName,
    serviceNameAnchorEl: null,
  };

  public componentDidMount() {
    const altinnWindow: any = window;
    const { org, app } = altinnWindow;

    handleServiceInformationActionDispatchers.fetchService(
      `${altinnWindow.location.origin}/designerapi/Repository/GetRepository?org=${org}&repository=${app}`);
    handleServiceInformationActionDispatchers.fetchInitialCommit(
      `${altinnWindow.location.origin}/designerapi/Repository/GetInitialCommit?org=${org}&repository=${app}`);
    handleServiceInformationActionDispatchers.fetchServiceConfig(
      `${altinnWindow.location.origin}/designer/${org}/${app}/Config/GetServiceConfig`);
  }

  public onServiceNameChanged = (event: any) => {
    this.setState({ serviceName: event.target.value, serviceNameAnchorEl: null });
  }

  public handleEditServiceName = () => {
    this.setState({ editServiceName: true });
  }

  public onBlurServiceName = () => {
    if (this.state.editServiceName && (!this.state.serviceName || this.state.serviceName === '')) {
      this.setState({
        serviceNameAnchorEl: document.getElementById('administrationInputServicename'),
      });
    } else {
      const { org, app } = window as Window as IAltinnWindow;
      // tslint:disable-next-line:max-line-length
      handleServiceInformationActionDispatchers.saveServiceName(`${window.location.origin}/designer/${org}/${app}/Text/SetServiceName`, this.state.serviceName);
      handleServiceInformationActionDispatchers.saveServiceConfig(
        `${window.location.origin}/designer/${org}/${app}/Config/SetServiceConfig`,
        this.state.serviceDescription, this.state.serviceId, this.state.serviceName);
      this.setState({ editServiceName: false });
    }
  }

  public onServiceDescriptionChanged = (event: any) => {
    this.setState({ serviceDescription: event.target.value, editServiceDescription: true });
  }

  public onBlurServiceDescription = () => {
    if (this.state.editServiceDescription) {
      const { org, app } = window as Window as IAltinnWindow;
      // tslint:disable-next-line:max-line-length
      handleServiceInformationActionDispatchers.saveServiceConfig(
        `${window.location.origin}/designer/${org}/${app}/Config/SetServiceConfig`,
        this.state.serviceDescription, this.state.serviceId, this.state.serviceName);
      this.setState({ editServiceDescription: false });
    }
  }

  public onServiceIdChanged = (event: any) => {
    this.setState({ serviceId: event.target.value, editServiceId: true });
  }

  public onBlurServiceId = () => {
    if (this.state.editServiceId) {
      const { org, app } = window as Window as IAltinnWindow;
      // tslint:disable-next-line:max-line-length
      handleServiceInformationActionDispatchers.saveServiceConfig(
        `${window.location.origin}/designer/${org}/${app}/Config/SetServiceConfig`,
        this.state.serviceDescription, this.state.serviceId, this.state.serviceName);
      this.setState({ editServiceId: false });
    }
  }

  public renderSideMenuContent = (): JSX.Element => {
    const {classes} = this.props;
    return (
      <>
        <Typography className={classes.sidebarHeader}>
        {getLanguageFromKey('general.service_owner', this.props.language)}
        </Typography>
        <Typography className={classes.sidebarInfoText}>
          {getLanguageFromKey('administration.service_owner_is', this.props.language)}
        </Typography>
        <Typography className={classNames(classes.sidebarServiceOwner, classes.sidebarInfoText)}>
          <img
            src={this.props.service.owner.avatar_url}
            className={classNames(classes.avatar)}
            alt=''
          /> {this.props.service.owner.full_name || this.props.service.owner.login}
        </Typography>
        {this.props.initialCommit &&
          <Typography className={classNames(classes.sidebarCreatedBy)}>
            {/* tslint:disable-next-line:max-line-length */}
            {getLanguageFromKey('administration.created_by', this.props.language)} {formatNameAndDate(this.props.initialCommit.author.name, this.props.initialCommit.author.when)}
          </Typography>
        }
    </>
    );
  }

  public renderMainContent = (): JSX.Element => {
    const { classes } = this.props;
    return (
      <>
        <div className={classes.marginBottom_24}>
          <AltinnInputField
            id='administrationInputServicename'
            onChangeFunction={this.onServiceNameChanged}
            inputHeader={getLanguageFromKey('general.service_name', this.props.language)}
            // tslint:disable-next-line:max-line-length
            inputDescription={getLanguageFromKey('administration.service_name_administration_description', this.props.language)}
            inputValue={this.state.serviceName}
            onBlurFunction={this.onBlurServiceName}
            btnText={getLanguageFromKey('general.edit', this.props.language)}
            onBtnClickFunction={this.handleEditServiceName}
            isDisabled={!this.state.editServiceName}
            focusOnComponentDidUpdate={this.state.editServiceName}
            inputHeaderStyling={{ fontSize: 20, fontWeight: 500 }}
            inputFieldStyling={this.state.editServiceName ?
              { background: theme.altinnPalette.primary.white } : null}
          />
        </div>
        <AltinnPopper
          anchorEl={this.state.serviceNameAnchorEl}
          message={getLanguageFromKey('administration.service_name_empty_message', this.props.language)}
        />
        <div className={classes.marginBottom_24}>
          <AltinnInputField
            id='administrationInputServiceid'
            onChangeFunction={this.onServiceIdChanged}
            inputHeader={getLanguageFromKey('administration.service_id', this.props.language)}
            // tslint:disable-next-line:max-line-length
            inputDescription={getLanguageFromKey('administration.service_id_description', this.props.language)}
            inputValue={this.state.serviceId}
            onBlurFunction={this.onBlurServiceId}
            inputHeaderStyling={{ fontSize: 20, fontWeight: 500 }}
          />
        </div>
        <div className={classes.marginBottom_24}>
          <AltinnInputField
            id='administrationInputReponame'
            inputHeader={getLanguageFromKey('general.service_saved_name', this.props.language)}
            // tslint:disable-next-line:max-line-length
            inputDescription={getLanguageFromKey('administration.service_saved_name_administration_description', this.props.language)}
            inputValue={this.props.service ? this.props.service.name : ''}
            isDisabled={true}
            inputHeaderStyling={{ fontSize: 20, fontWeight: 500 }}
          />
        </div>
        <div className={classes.marginBottom_24}>
          <AltinnInputField
            id='administrationInputDescription'
            onChangeFunction={this.onServiceDescriptionChanged}
            inputHeader={getLanguageFromKey('administration.service_comment', this.props.language)}
            // tslint:disable-next-line:max-line-length
            inputDescription={getLanguageFromKey('administration.service_comment_description', this.props.language)}
            textAreaRows={7}
            inputValue={this.state.serviceDescription}
            onBlurFunction={this.onBlurServiceDescription}
            inputHeaderStyling={{ fontSize: 20, fontWeight: 500 }}
          />
        </div>
      </>
    );
  }

  public render() {
    const { classes } = this.props;

    return (
      <div>
        {this.props.service &&
        this.props.serviceName !== null &&
        this.props.serviceDescription !== null &&
        this.props.serviceId !== null ?
          <AltinnColumnLayout
            aboveColumnChildren={
              <div className={this.props.classes.versionControlHeaderMargin}>
                <VersionControlHeader language={this.props.language} />
              </div>}
            children={this.renderMainContent()}
            sideMenuChildren={this.renderSideMenuContent()}
            header={getLanguageFromKey('administration.administration', this.props.language)}
          />
          :
          <Grid container={true}>
            <AltinnSpinner spinnerText='Laster siden' styleObj={classes.spinnerLocation} />
          </Grid>
        }
      </div>
    );
  }
}
const mapStateToProps = (
  state: IServiceDevelopmentState,
  props: IAdministrationComponentProvidedProps,
): IAdministrationComponentProps => {
  return {
    classes: props.classes,
    initialCommit: state.serviceInformation.initialCommit,
    language: state.language,
    service: state.serviceInformation.repositoryInfo,
    // tslint:disable-next-line:max-line-length
    serviceDescription: state.serviceInformation.serviceDescriptionObj ? state.serviceInformation.serviceDescriptionObj.description : '',
    // tslint:disable-next-line:max-line-length
    serviceDescriptionIsSaving: state.serviceInformation.serviceDescriptionObj ? state.serviceInformation.serviceDescriptionObj.saving : false,
    serviceId: state.serviceInformation.serviceIdObj ? state.serviceInformation.serviceIdObj.serviceId : '',
    serviceIdIsSaving: state.serviceInformation.serviceIdObj ? state.serviceInformation.serviceIdObj.saving : false,
    serviceName: state.serviceInformation.serviceNameObj ? state.serviceInformation.serviceNameObj.name : '',
    // tslint:disable-next-line:max-line-length
    serviceNameIsSaving: state.serviceInformation.serviceNameObj ? state.serviceInformation.serviceNameObj.saving : false,
  };
};

export const Administration = withStyles(styles)(connect(mapStateToProps)(AdministrationComponent));
