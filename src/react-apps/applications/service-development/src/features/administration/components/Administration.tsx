
import { createMuiTheme, createStyles, Grid, Typography, withStyles } from '@material-ui/core';
import classNames = require('classnames');
import * as React from 'react';
import { connect } from 'react-redux';
import AltinnInputField from '../../../../../shared/src/components/AltinnInputField';
import AltinnPopper from '../../../../../shared/src/components/AltinnPopper';
import AltinnSpinner from '../../../../../shared/src/components/AltinnSpinner';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';
import { formatNameAndDate } from '../../../../../shared/src/utils/formatDate';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import VersionControlHeader from '../../../../../shared/src/version-control/versionControlHeader';
import { ICommit, IRepository } from '../../../types/global';
import handleServiceInformationActionDispatchers from '../handleServiceInformationDispatcher';
export interface IAdministrationComponentProvidedProps {
  classes: any;
}

export interface IAdministrationComponentProps extends IAdministrationComponentProvidedProps {
  language: any;
  service: IRepository;
  serviceName: string;
  serviceNameIsSaving: boolean;
  initialCommit: ICommit;
  serviceDescription: string;
  serviceDescriptionIsSaving: boolean;
}

export interface IAdministrationComponentState {
  serviceDescription: string;
  serviceName: string;
  editServiceName: boolean;
  editServiceDescription: boolean;
  serviceNameAnchorEl: any;
}

const theme = createMuiTheme(altinnTheme);

const styles = createStyles({
  mainStyle: {
    paddingLeft: 60,
    paddingRight: 60,
  },
  headerStyle: {
    fontSize: 36,
    marginTop: 30,
    marginBottom: 30,
  },
  sidebar: {
    borderLeft: '1px solid ' + theme.altinnPalette.primary.greyMedium,
    paddingLeft: 10,
  },
  sidebarHeader: {
    marginTop: 40,
    marginBottom: 20,
    fontSize: 16,
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
  layout: {
    paddingBottom: 50,
  },
  mainLayout: {
    [theme.breakpoints.down('sm')]: {
      height: `calc(100vh - 55px - 36px)`, // TODO: remove 36 when old top menu is removed
      overflowY: 'auto',
    },
    [theme.breakpoints.up('md')]: {
      height: `calc(100vh - 110px - 36px)`, // TODO: remove 36 when old top menu is removed
      overflowY: 'auto',
    },
  },
});

export class AdministrationComponent extends
  React.Component<IAdministrationComponentProps, IAdministrationComponentState> {
  public static getDerivedStateFromProps(_props: IAdministrationComponentProps, _state: IAdministrationComponentState) {
    if (_state.editServiceName || _props.serviceNameIsSaving) {
      return {
        serviceName: _state.serviceName,
        serviceDescription: _props.serviceDescription,
      };
    }
    if (_state.editServiceDescription || _props.serviceDescriptionIsSaving) {
      return {
        serviceDescription: _state.serviceDescription,
        serviceName: _props.serviceName,
      };
    }
    return {
      serviceDescription: _props.serviceDescription,
      serviceName: _props.serviceName,
    };
  }

  public state: IAdministrationComponentState = {
    serviceDescription: '',
    serviceName: this.props.serviceName,
    editServiceName: false,
    editServiceDescription: false,
    serviceNameAnchorEl: null,
  };

  public componentDidMount() {
    const altinnWindow: any = window;
    const { org, service } = altinnWindow;

    handleServiceInformationActionDispatchers.fetchService(
      `${altinnWindow.location.origin}/designerapi/Repository/GetRepository?owner=${org}&repository=${service}`);
    handleServiceInformationActionDispatchers.fetchInitialCommit(
      `${altinnWindow.location.origin}/designerapi/Repository/GetInitialCommit?owner=${org}&repository=${service}`);
    handleServiceInformationActionDispatchers.fetchServiceName(
      `${altinnWindow.location.origin}/designer/${org}/${service}/Text/GetServiceName`);
    handleServiceInformationActionDispatchers.fetchServiceDescription(
      `${altinnWindow.location.origin}/designer/${org}/${service}/Config/GetServiceDescription`);
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
        serviceNameAnchorEl: document.getElementById('service-name'),
      });
    }

    if (this.state.editServiceName) {
      const altinnWindow: any = window;
      const { org, service } = altinnWindow;
      // tslint:disable-next-line:max-line-length
      handleServiceInformationActionDispatchers.saveServiceName(`${altinnWindow.location.origin}/designer/${org}/${service}/Text/SetServiceName`, this.state.serviceName);
      this.setState({ editServiceName: false });
    }
  }

  public onServiceDescriptionChanged = (event: any) => {
    this.setState({ serviceDescription: event.target.value, editServiceDescription: true });
  }

  public onBlurServiceDescription = () => {
    if (this.state.editServiceDescription) {
      const altinnWindow: any = window;
      const { org, service } = altinnWindow;
      // tslint:disable-next-line:max-line-length
      handleServiceInformationActionDispatchers.saveServiceDescription(`${altinnWindow.location.origin}/designer/${org}/${service}/Config/SetServiceDescription`, this.state.serviceDescription);
      this.setState({ editServiceDescription: false });
    }
  }

  public render() {
    const { classes } = this.props;

    return (
      <div className={classes.mainLayout}>
        <VersionControlHeader language={this.props.language} />
        {this.props.service || this.props.serviceName === null || this.props.serviceDescription === null ?
          <Grid container={true} className={classes.layout}>
            <Grid item={true} className={classes.mainStyle} md={12}>
              <Typography className={classes.headerStyle}>
                {getLanguageFromKey('administration.administration', this.props.language)}
              </Typography>
            </Grid>
            <Grid item={true} className={classes.mainStyle} md={8}>
              <AltinnInputField
                id='service-name'
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
                inputFieldStyling={this.state.editServiceName ?
                  { background: theme.altinnPalette.primary.white } :
                  { border: '1px solid ' + theme.altinnPalette.primary.blueDark }}
              />
              <AltinnPopper
                anchorEl={this.state.serviceNameAnchorEl}
                message={getLanguageFromKey('administration.service_name_empty_message', this.props.language)}
              />
              <AltinnInputField
                id='repo-name'
                inputHeader={getLanguageFromKey('general.service_saved_name', this.props.language)}
                // tslint:disable-next-line:max-line-length
                inputDescription={getLanguageFromKey('administration.service_saved_name_administration_description', this.props.language)}
                inputValue={this.props.service ? this.props.service.name : ''}
                isDisabled={true}
              />
              <AltinnInputField
                id='description'
                onChangeFunction={this.onServiceDescriptionChanged}
                inputHeader={getLanguageFromKey('general.service_description_header', this.props.language)}
                inputDescription={getLanguageFromKey('administration.description_description', this.props.language)}
                textAreaRows={7}
                inputValue={this.state.serviceDescription}
                onBlurFunction={this.onBlurServiceDescription}
              />
            </Grid>
            <Grid item={true} md={4} className={classNames(classes.sidebar)}>
              <Typography className={classes.sidebarHeader}>
                {getLanguageFromKey('general.service_owner', this.props.language)}
              </Typography>
              <Typography className={classes.sidebarInfoText}>
                {getLanguageFromKey('administration.service_owner_is', this.props.language)}
              </Typography>
              <Typography className={classNames(classes.sidebarServiceOwner, classes.sidebarInfoText)}>
                <i
                  className={classNames(classes.iconStyling,
                    {
                      ['ai ai-corp']: this.props.service.owner.UserType === 2,
                      ['ai ai-private']: this.props.service.owner.UserType !== 2,
                    })}
                  aria-hidden='true'
                />
                {this.props.service.owner.full_name || this.props.service.owner.login}
              </Typography>
              {this.props.initialCommit &&
                <Typography className={classNames(classes.sidebarCreatedBy)}>
                  {/* tslint:disable-next-line:max-line-length */}
                  {getLanguageFromKey('administration.created_by', this.props.language)} {formatNameAndDate(this.props.initialCommit.author.name, this.props.initialCommit.author.when)}
                </Typography>
              }
            </Grid>
          </Grid>
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
    language: state.language,
    classes: props.classes,
    service: state.serviceInformation.repositoryInfo,
    serviceName: state.serviceInformation.serviceNameObj ? state.serviceInformation.serviceNameObj.name : '',
    // tslint:disable-next-line:max-line-length
    serviceNameIsSaving: state.serviceInformation.serviceNameObj ? state.serviceInformation.serviceNameObj.saving : false,
    initialCommit: state.serviceInformation.initialCommit,
    // tslint:disable-next-line:max-line-length
    serviceDescription: state.serviceInformation.serviceDescriptionObj ? state.serviceInformation.serviceDescriptionObj.description : '',
    // tslint:disable-next-line:max-line-length
    serviceDescriptionIsSaving: state.serviceInformation.serviceDescriptionObj ? state.serviceInformation.serviceDescriptionObj.saving : false,

  };
};

export const Administration = withStyles(styles)(connect(mapStateToProps)(AdministrationComponent));
