import { createStyles, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { connect } from 'react-redux';
import AltinnButton from '../../../../shared/src/components/AltinnButton';
import AltinnDropdown from '../../../../shared/src/components/AltinnDropdown';
import AltinnIconButton from '../../../../shared/src/components/AltinnIconButton';
import AltinnInputField from '../../../../shared/src/components/AltinnInputField';
import AltinnModal from '../../../../shared/src/components/AltinnModal';
import AltinnPopper from '../../../../shared/src/components/AltinnPopper';
import AltinnSpinner from '../../../../shared/src/components/AltinnSpinner';
import { getLanguageFromKey } from '../../../../shared/src/utils/language';
import { post } from '../../../../shared/src/utils/networking';
export interface ICreateNewServiceProvidedProps {
  classes: any;
}

export interface ICreateNewServiceProps extends ICreateNewServiceProvidedProps {
  language: any;
  selectableUser: any;
}

export interface ICreateNewServiceState {
  isOpen: boolean;
  serviceOwnerAnchorEl: any;
  serviceOwnerPopperMessage: string;
  repoNameAnchorEl: any;
  repoNamePopperMessage: string;
  selectedOrgOrUser: string;
  selectedOrgOrUserDisabled: boolean;
  serviceName: string;
  repoName: string;
  isLoading: boolean;
}

const styles = createStyles({
  button: {
    fontSize: '16px',
    padding: '5px 45px 5px 45px',
    height: '37px !Important',
  },
  popperZIndex: {
    zIndex: 1300,
  },
});

export class CreateNewServiceComponent extends React.Component<ICreateNewServiceProps, ICreateNewServiceState> {
  public _isMounted = false;
  public state: ICreateNewServiceState = {
    isOpen: false,
    serviceOwnerAnchorEl: null,
    serviceOwnerPopperMessage: '',
    repoNameAnchorEl: null,
    repoNamePopperMessage: '',
    selectedOrgOrUser: '',
    selectedOrgOrUserDisabled: false,
    serviceName: '',
    repoName: '',
    isLoading: false,
  };

  public handleModalOpen = () => {
    this.setState({
      isOpen: true,
      selectedOrgOrUser: this.props.selectableUser.length === 1 ? this.props.selectableUser[0] : '',
      selectedOrgOrUserDisabled: this.props.selectableUser.length === 1,
    });
  }

  public componentDidMount() {
    this._isMounted = true;
  }

  public componentWillUnmount() {
    this._isMounted = false;
  }

  public handleModalClose = () => {
    this.setState({
      isOpen: false,
      serviceOwnerAnchorEl: null,
      serviceOwnerPopperMessage: '',
      repoNameAnchorEl: null,
      repoNamePopperMessage: '',
      selectedOrgOrUser: '',
      serviceName: '',
      repoName: '',
    });
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

  public handleUpdateDropdown = (event: any) => {
    this.setState({
      selectedOrgOrUser: event.target.value,
      serviceOwnerAnchorEl: null,
    });
  }

  public handleServiceNameUpdated = (event: any) => {
    this.setState({ serviceName: event.target.value });
  }

  public handleRepoNameUpdated = (event: any) => {
    this.setState({
      repoName: event.target.value,
      repoNameAnchorEl: null,
    });
  }

  public handleServiceNameOnBlur = () => {
    if (this.state.serviceName && !this.state.repoName) {
      this.setState({
        repoName: this.createRepoNameFromServiceName(this.state.serviceName),
      });
    }
  }

  public createRepoNameFromServiceName(serviceName: string) {
    return serviceName
      .replace(/^[0-9 _]+/, '')
      .replace(/[ ]+/g, '_')
      .replace(/[æÆ]+/g, 'ae')
      .replace(/[øØ]+/g, 'oe')
      .replace(/[åÅ]+/g, 'aa')
      .replace(/[^0-9a-zA-Z_]+/g, '_').substring(0, 100);
  }

  public validateService = () => {
    let serviceIsValid = true;
    if (!this.state.selectedOrgOrUser) {
      this.showServiceOwnerPopper(getLanguageFromKey('dashboard.field_cannot_be_empty', this.props.language));
      serviceIsValid = false;
    }
    if (!this.state.repoName) {
      this.showRepoNamePopper(getLanguageFromKey('dashboard.field_cannot_be_empty', this.props.language));
      serviceIsValid = false;
    }

    if (this.state.repoName && !/^[a-zA-Z]+[a-zA-Z0-9_]*$/.test(this.state.repoName)) {
      this.showRepoNamePopper(getLanguageFromKey('dashboard.service_name_has_illegal_characters', this.props.language));
      serviceIsValid = false;
    }

    if (this.state.repoName.length > 100) {
      this.showRepoNamePopper(getLanguageFromKey('dashboard.service_name_is_too_long', this.props.language));
      serviceIsValid = false;
    }
    return serviceIsValid;
  }

  public createNewService = () => {
    const serviceIsValid = this.validateService();
    if (serviceIsValid) {
      this.setState({
        isLoading: true,
      });
      const altinnWindow: Window = window;
      // tslint:disable-next-line:max-line-length
      const url = `${altinnWindow.location.origin}/designerapi/Repository/CreateService?org=${this.state.selectedOrgOrUser}&serviceName=${this.state.serviceName}&repoName=${this.state.repoName}`;
      post(url).then((result: any) => {
        if (this._isMounted && result.repositoryCreatedStatus === 422) {
          this.setState({
            isLoading: false,
          });
          this.showRepoNamePopper(getLanguageFromKey('dashboard.service_name_already_exist', this.props.language));
        } else if (result.repositoryCreatedStatus === 201) {
          window.location.assign(`${altinnWindow.location.origin}/designer/${result.full_name}#/aboutservice`);
        }
      });
    }
  }

  public render() {
    const { classes } = this.props;
    return (
      <div>
        <AltinnIconButton
          id={'ceateService'}
          onclickFunction={this.handleModalOpen}
          btnText={getLanguageFromKey('dashboard.new_service', this.props.language)}
          iconClass='ai ai-circle-plus'
        />
        <AltinnModal
          isOpen={this.state.isOpen}
          onClose={this.handleModalClose}
          headerText={getLanguageFromKey('dashboard.new_service_header', this.props.language)}
        >
          <AltinnDropdown
            id={'service-owner'}
            inputHeader={getLanguageFromKey('general.service_owner', this.props.language)}
            inputDescription={getLanguageFromKey('dashboard.service_owner_description', this.props.language)}
            handleChange={this.handleUpdateDropdown}
            dropdownItems={this.props.selectableUser}
            selectedValue={this.state.selectedOrgOrUser}
            disabled={this.state.selectedOrgOrUserDisabled}
          />
          <AltinnPopper
            anchorEl={this.state.serviceOwnerAnchorEl}
            message={this.state.serviceOwnerPopperMessage}
            styleObj={classes.popperZIndex}
          />
          <AltinnInputField
            id={'service-name'}
            inputHeader={getLanguageFromKey('general.service_name', this.props.language)}
            inputDescription={getLanguageFromKey('dashboard.service_name_description', this.props.language)}
            inputValue={this.state.serviceName}
            onChangeFunction={this.handleServiceNameUpdated}
            onBlurFunction={this.handleServiceNameOnBlur}
          />
          <AltinnInputField
            id={'service-saved-name'}
            inputHeader={getLanguageFromKey('general.service_saved_name', this.props.language)}
            inputDescription={getLanguageFromKey('dashboard.service_saved_name_description', this.props.language)}
            inputValue={this.state.repoName}
            onChangeFunction={this.handleRepoNameUpdated}
          />
          <AltinnPopper
            anchorEl={this.state.repoNameAnchorEl}
            message={this.state.repoNamePopperMessage}
            styleObj={classes.popperZIndex}
          />
          {this.state.isLoading ?
            <AltinnSpinner
              spinnerText={getLanguageFromKey('dashboard.creating_your_service', this.props.language)}
            />
            :
            <AltinnButton
              btnText={getLanguageFromKey('dashboard.create_service_btn', this.props.language)}
              className={classes.button}
              onClickFunction={this.createNewService}
            />

          }

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
  props: ICreateNewServiceProvidedProps,
): ICreateNewServiceProps => {
  return {
    classes: props.classes,
    language: state.language.language,
    selectableUser: combineCurrentUserAndOrg(state.dashboard.organizations, state.dashboard.user),

  };
};

export const CreateNewService = withStyles(styles)(connect(mapStateToProps)(CreateNewServiceComponent));
