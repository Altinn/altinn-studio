import { createStyles, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { connect } from 'react-redux';
import AltinnButton from 'app-shared/components/AltinnButton';
import AltinnDropdown from 'app-shared/components/AltinnDropdown';
import AltinnIconButton from 'app-shared/components/AltinnIconButton';
import AltinnInputField from 'app-shared/components/AltinnInputField';
import AltinnPopper from 'app-shared/components/AltinnPopper';
import AltinnSpinner from 'app-shared/components/AltinnSpinner';
import AltinnModal from 'app-shared/components/molecules/AltinnModal';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { post } from 'app-shared/utils/networking';

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
  marginBottom_24: {
    marginBottom: 24,
  },
});

export const appNameRegex = /^(?!datamodels$)[a-z]+[a-z0-9-]+[a-z0-9]$/;

const validateRepoName = (repoName: string) => {
  return appNameRegex.test(repoName);
};

export class CreateNewServiceComponent extends React.Component<
  ICreateNewServiceProps,
  ICreateNewServiceState
> {
  public state: ICreateNewServiceState = {
    isOpen: false,
    serviceOwnerAnchorEl: null,
    serviceOwnerPopperMessage: '',
    repoNameAnchorEl: null,
    repoNamePopperMessage: '',
    selectedOrgOrUser: '',
    selectedOrgOrUserDisabled: false,
    repoName: '',
    isLoading: false,
  };

  public componentDidMount() {
    this.componentMounted = true;
  }

  public componentWillUnmount() {
    this.componentMounted = false;
  }

  public handleModalOpen = () => {
    const { selectableUser } = this.props;
    const user = selectableUser?.length === 1 && selectableUser[0];
    this.setState({
      isOpen: true,
      selectedOrgOrUser: user ? user.full_name || user.name : '',
      selectedOrgOrUserDisabled: selectableUser.length === 1,
    });
  };

  public handleModalClose = () => {
    this.setState({
      isOpen: false,
      serviceOwnerAnchorEl: null,
      serviceOwnerPopperMessage: '',
      repoNameAnchorEl: null,
      repoNamePopperMessage: '',
      selectedOrgOrUser: '',
      repoName: '',
    });
  };

  public handleUpdateDropdown = (event: any) => {
    this.setState({
      selectedOrgOrUser: event.target.value,
      serviceOwnerAnchorEl: null,
    });
  };

  public handleRepoNameUpdated = (event: any) => {
    this.setState({
      repoName: event.target.value,
      repoNameAnchorEl: null,
    });
  };

  public getListOfUsers() {
    return this.props.selectableUser.map(
      (user: any) => user.full_name || user.name,
    );
  }

  public componentMounted = false;

  public showServiceOwnerPopper = (message: string) => {
    this.setState({
      serviceOwnerAnchorEl: document.getElementById('service-owner'),
      serviceOwnerPopperMessage: message,
    });
  };

  public showRepoNamePopper = (message: string) => {
    this.setState({
      repoNameAnchorEl: document.getElementById('service-saved-name'),
      repoNamePopperMessage: message,
    });
  };

  public validateService = () => {
    let serviceIsValid = true;
    if (!this.state.selectedOrgOrUser) {
      this.showServiceOwnerPopper(
        getLanguageFromKey(
          'dashboard.field_cannot_be_empty',
          this.props.language,
        ),
      );
      serviceIsValid = false;
    }
    if (!this.state.repoName) {
      this.showRepoNamePopper(
        getLanguageFromKey(
          'dashboard.field_cannot_be_empty',
          this.props.language,
        ),
      );
      serviceIsValid = false;
    }

    if (this.state.repoName && !validateRepoName(this.state.repoName)) {
      this.showRepoNamePopper(
        getLanguageFromKey(
          'dashboard.service_name_has_illegal_characters',
          this.props.language,
        ),
      );
      serviceIsValid = false;
    }

    if (this.state.repoName.length > 30) {
      this.showRepoNamePopper(
        getLanguageFromKey(
          'dashboard.service_name_is_too_long',
          this.props.language,
        ),
      );
      serviceIsValid = false;
    }
    return serviceIsValid;
  };

  public createNewService = () => {
    const serviceIsValid = this.validateService();
    if (serviceIsValid) {
      this.setState({
        isLoading: true,
      });
      const altinnWindow: Window = window;
      const selectedOrgOrUser = this.props.selectableUser.find(
        (user: any) =>
          user.full_name === this.state.selectedOrgOrUser ||
          user.name === this.state.selectedOrgOrUser,
      );
      const url = `${altinnWindow.location.origin}/designer/api/v1/repos/${selectedOrgOrUser.name}&repository=${this.state.repoName}`;
      post(url)
        .then((result: any) => {
          if (result.repositoryCreatedStatus === 409) {
            this.setState({
              isLoading: false,
            });
            this.showRepoNamePopper(
              getLanguageFromKey(
                'dashboard.app_already_exist',
                this.props.language,
              ),
            );
          } else if (result.repositoryCreatedStatus === 201) {
            window.location.assign(
              `${altinnWindow.location.origin}/designer/${result.full_name}#/about`,
            );
          } else {
            this.setState({
              isLoading: false,
            });
            this.showRepoNamePopper(
              getLanguageFromKey(
                'dashboard.error_when_creating_app',
                this.props.language,
              ),
            );
          }
        })
        .catch((error: Error) => {
          console.error('Unsucessful creating new app', error.message);
          if (this.componentMounted) {
            this.setState({
              isLoading: false,
            });
            this.showRepoNamePopper(
              getLanguageFromKey(
                'dashboard.error_when_creating_app',
                this.props.language,
              ),
            );
          }
        });
    }
  };

  public render() {
    const { classes } = this.props;
    return (
      <div>
        <AltinnIconButton
          id='createService'
          onclickFunction={this.handleModalOpen}
          btnText={getLanguageFromKey(
            'dashboard.new_service',
            this.props.language,
          )}
          iconClass='fa fa-circle-plus'
        />
        <AltinnModal
          isOpen={this.state.isOpen}
          onClose={this.handleModalClose}
          headerText={getLanguageFromKey(
            'dashboard.new_service_header',
            this.props.language,
          )}
        >
          <div className={classes.marginBottom_24}>
            <AltinnDropdown
              id='service-owner'
              inputHeader={getLanguageFromKey(
                'general.service_owner',
                this.props.language,
              )}
              inputDescription={getLanguageFromKey(
                'dashboard.service_owner_description',
                this.props.language,
              )}
              handleChange={this.handleUpdateDropdown}
              dropdownItems={this.getListOfUsers()}
              selectedValue={this.state.selectedOrgOrUser}
              disabled={this.state.selectedOrgOrUserDisabled}
            />
          </div>
          <AltinnPopper
            anchorEl={this.state.serviceOwnerAnchorEl}
            message={this.state.serviceOwnerPopperMessage}
            styleObj={classes.popperZIndex}
          />
          <div className={classes.marginBottom_24}>
            <AltinnInputField
              id='service-saved-name'
              inputHeader={getLanguageFromKey(
                'general.service_name',
                this.props.language,
              )}
              inputDescription={getLanguageFromKey(
                'dashboard.service_saved_name_description',
                this.props.language,
              )}
              inputValue={this.state.repoName}
              onChangeFunction={this.handleRepoNameUpdated}
            />
          </div>
          <AltinnPopper
            anchorEl={this.state.repoNameAnchorEl}
            message={this.state.repoNamePopperMessage}
            styleObj={classes.popperZIndex}
          />
          {this.state.isLoading ? (
            <AltinnSpinner
              spinnerText={getLanguageFromKey(
                'dashboard.creating_your_service',
                this.props.language,
              )}
            />
          ) : (
            <AltinnButton
              btnText={getLanguageFromKey(
                'dashboard.create_service_btn',
                this.props.language,
              )}
              className={classes.button}
              onClickFunction={this.createNewService}
            />
          )}
        </AltinnModal>
      </div>
    );
  }
}

const combineCurrentUserAndOrg = (organisations: any, user: any) => {
  const allUsers = organisations.map(({ username, full_name }: any) => ({
    name: username,
    full_name,
  }));
  const currentUserName = { name: user.login, full_name: user.full_name };
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
    selectableUser: combineCurrentUserAndOrg(
      state.dashboard.organisations,
      state.dashboard.user,
    ),
  };
};

export const CreateNewService = withStyles(styles)(
  connect(mapStateToProps)(CreateNewServiceComponent),
);
