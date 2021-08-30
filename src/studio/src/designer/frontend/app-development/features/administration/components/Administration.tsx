/* eslint-disable max-len */

import { createTheme, createStyles, Grid, withStyles } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import AltinnColumnLayout from 'app-shared/components/AltinnColumnLayout';
import AltinnSpinner from 'app-shared/components/AltinnSpinner';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import { getLanguageFromKey } from 'app-shared/utils/language';
import VersionControlHeader from 'app-shared/version-control/versionControlHeader';
import { ICommit, IRepository } from '../../../types/global';
import { HandleServiceInformationActions } from '../handleServiceInformationSlice';
import { fetchRepoStatus } from '../../handleMergeConflict/handleMergeConflictSlice';
import MainContent from './MainContent';
import SideMenuContent from './SideMenuContent';
import { repoStatusUrl } from '../../../utils/urlHelper';

export interface IAdministrationComponentProvidedProps {
  classes: any;
  dispatch?: Dispatch;
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

const theme = createTheme(altinnTheme);

const styles = createStyles({
  avatar: {
    maxHeight: '2em',
  },
  sidebarHeader: {
    marginBottom: 20,
    fontSize: 20,
    fontWeight: 500,
  },
  sidebarHeaderSecond: {
    marginTop: 36,
  },
  sidebarInfoText: {
    fontSize: 16,
    marginBottom: 12,
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

  // eslint-disable-next-line react/state-in-constructor
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

    this.props.dispatch(HandleServiceInformationActions.fetchService(
      { url: `${altinnWindow.location.origin}/designerapi/Repository/GetRepository?org=${org}&repository=${app}` },
    ));
    this.props.dispatch(HandleServiceInformationActions.fetchInitialCommit(
      { url: `${altinnWindow.location.origin}/designerapi/Repository/GetInitialCommit?org=${org}&repository=${app}` },
    ));
    this.props.dispatch(HandleServiceInformationActions.fetchServiceConfig(
      { url: `${altinnWindow.location.origin}/designer/${org}/${app}/Config/GetServiceConfig` },
    ));
    this.props.dispatch(fetchRepoStatus({
      url: repoStatusUrl,
      org,
      repo: app,
    }));
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
      // eslint-disable-next-line max-len
      this.props.dispatch(HandleServiceInformationActions.saveServiceName({
        url: `${window.location.origin}/designer/${org}/${app}/Text/SetServiceName`,
        newServiceName: this.state.serviceName,
      }));
      this.props.dispatch(HandleServiceInformationActions.saveServiceConfig({
        url: `${window.location.origin}/designer/${org}/${app}/Config/SetServiceConfig`,
        newServiceDescription: this.state.serviceDescription,
        newServiceId: this.state.serviceId,
        newServiceName: this.state.serviceName,
      }));
      this.setState({ editServiceName: false });
    }
  }

  public onServiceDescriptionChanged = (event: any) => {
    this.setState({ serviceDescription: event.target.value, editServiceDescription: true });
  }

  public onBlurServiceDescription = () => {
    if (this.state.editServiceDescription) {
      const { org, app } = window as Window as IAltinnWindow;
      // eslint-disable-next-line max-len
      this.props.dispatch(HandleServiceInformationActions.saveServiceConfig({
        url: `${window.location.origin}/designer/${org}/${app}/Config/SetServiceConfig`,
        newServiceDescription: this.state.serviceDescription,
        newServiceId: this.state.serviceId,
        newServiceName: this.state.serviceName,
      }));
      this.setState({ editServiceDescription: false });
    }
  }

  public onServiceIdChanged = (event: any) => {
    this.setState({ serviceId: event.target.value, editServiceId: true });
  }

  public onBlurServiceId = () => {
    if (this.state.editServiceId) {
      const { org, app } = window as Window as IAltinnWindow;
      // eslint-disable-next-line max-len
      this.props.dispatch(HandleServiceInformationActions.saveServiceConfig({
        url: `${window.location.origin}/designer/${org}/${app}/Config/SetServiceConfig`,
        newServiceDescription: this.state.serviceDescription,
        newServiceId: this.state.serviceId,
        newServiceName: this.state.serviceName,
      }));
      this.setState({ editServiceId: false });
    }
  }

  public RenderMainContent = () => {
    return (
      <MainContent
        editServiceName={this.state.editServiceName}
        handleEditServiceName={this.handleEditServiceName}
        language={this.props.language}
        onBlurServiceDescription={this.onBlurServiceDescription}
        onBlurServiceId={this.onBlurServiceId}
        onBlurServiceName={this.onBlurServiceName}
        onServiceDescriptionChanged={this.onServiceDescriptionChanged}
        onServiceIdChanged={this.onServiceIdChanged}
        onServiceNameChanged={this.onServiceNameChanged}
        service={this.props.service}
        serviceDescription={this.state.serviceDescription}
        serviceId={this.state.serviceId}
        serviceName={this.state.serviceName}
        serviceNameAnchorEl={this.state.serviceNameAnchorEl}
      />
    );
  }

  public render() {
    const {
      classes, service, serviceName, serviceDescription, serviceId,
    } = this.props;
    const render = service &&
      serviceName !== null &&
      serviceDescription !== null &&
      serviceId !== null;
    const AboveColumnChildren = () => (
      <div className={classes.versionControlHeaderMargin}>
        <VersionControlHeader language={this.props.language} />
      </div>
    );
    const SideMenuChildren = () => (
      <SideMenuContent
        initialCommit={this.props.initialCommit}
        language={this.props.language}
        service={this.props.service}
      />
    );
    return (
      <div data-testid='administration-container'>
        {render ? (
          <AltinnColumnLayout
            aboveColumnChildren={<AboveColumnChildren />}
            sideMenuChildren={<SideMenuChildren />}
            header={getLanguageFromKey('administration.administration', this.props.language)}
          >
            <this.RenderMainContent />
          </AltinnColumnLayout>
        ) :
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
    dispatch: props.dispatch,
    initialCommit: state.serviceInformation.initialCommit,
    language: state.languageState.language,
    service: state.serviceInformation.repositoryInfo,
    serviceDescription: state.serviceInformation.serviceDescriptionObj ? state.serviceInformation.serviceDescriptionObj.description : '',
    serviceDescriptionIsSaving: state.serviceInformation.serviceDescriptionObj ? state.serviceInformation.serviceDescriptionObj.saving : false,
    serviceId: state.serviceInformation.serviceIdObj ? state.serviceInformation.serviceIdObj.serviceId : '',
    serviceIdIsSaving: state.serviceInformation.serviceIdObj ? state.serviceInformation.serviceIdObj.saving : false,
    serviceName: state.serviceInformation.serviceNameObj ? state.serviceInformation.serviceNameObj.name : '',
    serviceNameIsSaving: state.serviceInformation.serviceNameObj ? state.serviceInformation.serviceNameObj.saving : false,
  };
};

export const Administration = withStyles(styles)(connect(mapStateToProps)(AdministrationComponent));
