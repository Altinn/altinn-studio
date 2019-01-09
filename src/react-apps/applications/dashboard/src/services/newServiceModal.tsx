import { createMuiTheme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { connect } from 'react-redux';
import AltinnButton from '../../../shared/src/components/AltinnButton';
import AltinnDropdown from '../../../shared/src/components/AltinnDropdown';
import AltinnIconButton from '../../../shared/src/components/AltinnIconButton';
import AltinnInputField from '../../../shared/src/components/AltinnInputField';
import AltinnModal from '../../../shared/src/components/AltinnModal';
import altinnTheme from '../../../shared/src/theme/altinnStudioTheme';
import { getLanguageFromKey } from '../../../shared/src/utils/language';
import { post } from '../../../shared/src/utils/networking';
import AltinnPopper from '../../../shared/src/components/AltinnPopper';
export interface INewServiceModalProvidedProps {
  classes: any;
}

export interface INewServiceModalProps extends INewServiceModalProvidedProps {
  language: any;
  selectableUser: any;
}

export interface INewServiceModalState {
  isOpen: boolean;
  serviceOwnerAnchorEl: any;
  serviceOwnerPopperMessage: string;
  repoNameAnchorEl: any;
  repoNamePopperMessage: string;
  selectedOrgOrUser: string;
  serviceName: string;
  repoName: string;
}

const theme = createMuiTheme(altinnTheme);

const styles = {
  modal: {
    width: '876px',
    backgroundColor: theme.altinnPalette.primary.white,
    boxShadow: theme.shadows[5],
    outline: 'none',
    marginRight: 'auto',
    marginLeft: 'auto',
    marginTop: '10%',
  },
  header: {
    backgroundColor: altinnTheme.altinnPalette.primary.blueDarker,
    height: '96px',
    paddingLeft: 48,
    paddingTop: 30,
    paddingBottom: 30,
  },
  headerText: {
    fontSize: '28px',
    color: altinnTheme.altinnPalette.primary.white,
  },
  body: {
    paddingLeft: 90,
    paddingRight: 243,
    paddingTop: 45,
    paddingBottom: 34,
  },
  button: {
    fontSize: '16px',
    padding: '5px 45px 5px 45px',
    height: '37px !Important',
  },

};

class NewServiceModalComponent extends React.Component<INewServiceModalProps, INewServiceModalState> {
  public state: INewServiceModalState = {
    isOpen: false,
    serviceOwnerAnchorEl: null,
    serviceOwnerPopperMessage: '',
    repoNameAnchorEl: null,
    repoNamePopperMessage: '',
    selectedOrgOrUser: '',
    serviceName: '',
    repoName: '',
  };

  public handleOpen = () => {
    this.setState({ isOpen: true });
  }

  public handleClose = () => {
    this.setState({ isOpen: false });
  }

  public showServiceOwnerPopper = (message: string) => {
    this.setState(
      {
        serviceOwnerAnchorEl: document.getElementById('service-owner'),
        serviceOwnerPopperMessage: message,
      });
  }

  public showRepoNamePopper = (message: string) => {
    this.setState(
      {
        repoNameAnchorEl: document.getElementById('service-saved-name'),
        repoNamePopperMessage: message,
      });
  }

  public handleServiceOwnerSnackbarClose = () => {
    this.setState({ serviceOwnerAnchorEl: null });
  }

  public handleRepoNameSnackbarClose = () => {
    this.setState({ repoNameAnchorEl: null });
  }

  public handleUpdateDropdown = (event: any) => {
    this.setState({
      selectedOrgOrUser: event.target.value,
      serviceOwnerAnchorEl: null,
    });
  }

  public serviceNameUpdated = (event: any) => {
    this.setState({ serviceName: event.target.value });
  }

  public repoNameUpdated = (event: any) => {
    this.setState({
      repoName: event.target.value,
      repoNameAnchorEl: null,
    });
  }

  public createNewService = () => {
    if (!this.state.selectedOrgOrUser) {
      this.showServiceOwnerPopper(getLanguageFromKey('dashboard.field_cannot_be_empty', this.props.language));
    }

    if (!this.state.repoName) {
      this.showRepoNamePopper(getLanguageFromKey('dashboard.field_cannot_be_empty', this.props.language));
    }

    if (this.state.selectedOrgOrUser && this.state.repoName) {
      const altinnWindow: Window = window;
      // tslint:disable-next-line:max-line-length
      const url = `${altinnWindow.location.origin}/designerapi/Repository/CreateService?org=${this.state.selectedOrgOrUser}&serviceName=${this.state.serviceName}&repoName=${this.state.repoName}`;
      post(url).then((result: any) => {
        console.log(result);
        result
        //this.handleSnackbarOpen();
      });
    }
    // TODO: hva hvis det er null?
  }

  public render() {
    const { classes } = this.props;
    return (
      <div>
        <AltinnIconButton
          onclickFunction={this.handleOpen}
          btnText={getLanguageFromKey('dashboard.new_service', this.props.language)}
          iconClass='ai ai-circle-plus'
        />
        <AltinnModal
          isOpen={this.state.isOpen}
          onClose={this.handleClose}
          headerText={getLanguageFromKey('dashboard.new_service_header', this.props.language)}
        >
          <AltinnDropdown
            id={'service-owner'}
            inputHeader={getLanguageFromKey('dashboard.service_owner', this.props.language)}
            inputDescription={getLanguageFromKey('dashboard.service_owner_description', this.props.language)}
            handleChange={this.handleUpdateDropdown}
            dropdownItems={this.props.selectableUser}
            selectedValue={this.state.selectedOrgOrUser}
          />
          <AltinnPopper
            anchorEl={this.state.serviceOwnerAnchorEl}
            message={this.state.serviceOwnerPopperMessage}
          />
          <AltinnInputField
            id={'service-name'}
            inputHeader={getLanguageFromKey('dashboard.service_name', this.props.language)}
            inputDescription={getLanguageFromKey('dashboard.service_name_description', this.props.language)}
            inputValue={this.state.serviceName}
            onChangeFunction={this.serviceNameUpdated}
          />
          <AltinnInputField
            id={'service-saved-name'}
            inputHeader={getLanguageFromKey('dashboard.service_saved_name', this.props.language)}
            inputDescription={getLanguageFromKey('dashboard.service_saved_name_descripyion', this.props.language)}
            inputValue={this.state.repoName}
            onChangeFunction={this.repoNameUpdated}
          />
          <AltinnPopper
            anchorEl={this.state.repoNameAnchorEl}
            message={this.state.repoNamePopperMessage}
          />
          <AltinnButton
            btnText={getLanguageFromKey('dashboard.create_service_btn', this.props.language)}
            className={classes.button}
            onClickFunction={this.createNewService}
          />
        </AltinnModal>
      </div >
    );
  }
}
const combineCurrentUserAndOrg = (organizations: any, user: any) => {
  const allUsers = organizations.map((org: any) => org.full_name ? org.full_name : org.username);
  const currentUserName =
    user.full_name ? user.full_name : user.login;
  allUsers.push(currentUserName);
  return allUsers;
};

const mapStateToProps = (
  state: IDashboardAppState,
  props: INewServiceModalProvidedProps,
): INewServiceModalProps => {
  return {
    classes: props.classes,
    language: state.language.language,
    selectableUser: combineCurrentUserAndOrg(state.dashboard.organizations, state.dashboard.user),

  };
};

export const NewServiceModal = withStyles(styles)(connect(mapStateToProps)(NewServiceModalComponent));
