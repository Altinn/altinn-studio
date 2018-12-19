import { createMuiTheme, createStyles, Grid, WithStyles, withStyles, Button } from '@material-ui/core';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme'
import FetchChangesComponent from '../version-control/fetchChanges';
import PushChangesComponent from '../version-control/pushChanges';
import LargePopoverComponent from './largePopover';
import { getLanguageFromKey } from '../utils/language';
import { isRegExp } from 'util';
import { resultsAriaMessage } from 'react-select/lib/accessibility';

export interface IVersionControlHeaderProps extends WithStyles<typeof styles> {
  language: any;
}

export interface IVersionControlHeaderState {
  changesInMaster: boolean;
  changesInLocalRepo: boolean;
  moreThanAnHourSinceLastPush: boolean;
  hasPushRight: boolean;
  anchorEl: any;
  modalState: any;
}

const theme = createMuiTheme(altinnTheme);

const styles = createStyles({

});

const initialState = {
  header: '',
  descriptionText: '',
  isLoading: '',
  shouldShowDoneIcon: false,
  btnText: '',
  shouldShowCommitBox: false,
  btnMethod: '',
};

class VersionControlHeader extends React.Component<IVersionControlHeaderProps, IVersionControlHeaderState> {
  constructor(_props: IVersionControlHeaderProps) {
    super(_props);
    this.state = {
      changesInMaster: false,
      changesInLocalRepo: false,
      moreThanAnHourSinceLastPush: false,
      hasPushRight: false,
      anchorEl: null,
      modalState: initialState,
    };
  }

  public performFetch(url: string, callbackFunc: any) {
    fetch(url)
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          return null;
        }
      })
      .then(
        (result) => {
          callbackFunc(result);
        },
        (error) => {
          console.log('inside then' + error);
        },
      );
  }

  public checkLastPush() {
    if (!this.state.moreThanAnHourSinceLastPush) {
      const altinnWindow: IAltinnWindow = window as IAltinnWindow;
      const { org, service } = altinnWindow;
      const url = `${altinnWindow.location.origin}/designerapi/Repository/RepoStatus?org=${org}&repository=${service}`;
      this.performFetch(url, (result: any) => {
        if (result) {
          this.setState({
            changesInMaster: result.behindBy === 0 ? false : true,
            changesInLocalRepo: result.contentStatus.length > 0 ? true : false,
          });
        }
      });
    }
  }

  public getStatus(callbackFunc?: any) {
    this.checkLastPush();

    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;
    const url = `${altinnWindow.location.origin}/designerapi/Repository/RepoStatus?org=${org}&repository=${service}`;
    this.performFetch(url, (result: any) => {
      if (callbackFunc) {
        callbackFunc(result);
      } else {
        if (result) {
          this.setState({
            changesInMaster: result.behindBy === 0 ? false : true,
            changesInLocalRepo: result.contentStatus.length > 0 ? true : false,
          });
        }
      }
    });
  }

  public updateStateOnIntervals() {
    this.getStatus();
    this.getLastPush();
  }

  public getLastPush() {
    if (!this.state.moreThanAnHourSinceLastPush) {
      const altinnWindow: IAltinnWindow = window as IAltinnWindow;
      const { org, service } = altinnWindow;
      // TODO: correct url
      const url = `${altinnWindow.location.origin}/designerapi/Repository/Branches?owner=${org}&repo=${service}`;
      this.performFetch(url, (result: any) => {
        if (result) {
          console.log(result);
          // TODO: set moreThanAnHourSinceLastPush
        }
      });
    }
  }

  public componentWillMount() {
    // check status every 5 min
    setInterval(() => this.updateStateOnIntervals(), 300000);
    this.getStatus();
    this.getRepoRights();
    this.getLastPush();
  }

  public getRepoRights() {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const url = `${altinnWindow.location.origin}/designerapi/Repository/Search`;
    this.performFetch(url, (result: any) => {
      if (result) {
        const currentRepo = result.filter((e: any) => e.name === 'secondService');
        this.setState({
          hasPushRight: currentRepo.length > 0 ? currentRepo[0].permissions.push : false,
        });
      }
    });
  }

  public handleClose = () => {
    this.setState({
      anchorEl: null,
    });
  }

  public pullRepo = (modalState: any) => {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;
    const url = `${altinnWindow.location.origin}/designerapi/Repository/PullRepo?owner=${org}&repository=${service}`;
    this.performFetch(url, (result: any) => {
      if (result.ok) {
        this.setState({
          modalState,
        });
      }
    });
  }

  public fetchChanges = (currentTarget: any) => {
    this.setState({
      anchorEl: currentTarget,
      modalState: {
        header: getLanguageFromKey('sync_header.fetching_latest_version', this.props.language),
        isLoading: true,
      },
    });
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;
    const url = `${altinnWindow.location.origin}/designerapi/Repository/PullRepo?owner=${org}&repository=${service}`;
    this.performFetch(url, (result: any) => {
      if (result.ok) {
        this.setState({
          modalState: {
            header: getLanguageFromKey('sync_header.service_updated_to_latest', this.props.language),
            descriptionText:
              getLanguageFromKey('sync_header.service_updated_to_latest_submessage', this.props.language),
            isLoading: false,
            shouldShowDoneIcon: true,
          },
        });
      } else {
        // TODO: overwritten by merge
        this.setState({
          modalState: {
            header: getLanguageFromKey('sync_header.describe_and_validate', this.props.language),
            descriptionText:
              getLanguageFromKey('sync_header.describe_and_validate_submessage', this.props.language),
            btnText: getLanguageFromKey('sync_header.describe_and_validate_btnText', this.props.language),
            shouldShowCommitBox: true,
          },
        });
      }
    });
  }

  public shareChanges() {
    this.setState({
      modalState: {
        header: getLanguageFromKey('sync_header.sharing_changes', this.props.language),
        isLoading: true,
      },
    });

    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;
    const url = `${altinnWindow.location.origin}/designerapi/Repository/PullRepo?owner=${org}&repository=${service}`;
    this.performFetch(url, (result: any) => {
      if (result.ok) {
        this.setState({
          modalState: {
            header: getLanguageFromKey('sync_header.sharing_changes_completed', this.props.language),
            descriptionText:
              getLanguageFromKey('sync_header.sharing_changes_completed_submessage', this.props.language),
            btnText: getLanguageFromKey('sync_header.describe_and_validate_btnText', this.props.language),
            shouldShowDoneIcon: true,
          },
        });
      }
    });
  }

  public pushChanges = (currentTarget: any) => {
    if (this.state.hasPushRight) {
      this.getStatus((result: any) => {
        if (result) {
          if (result.aheadBy > 0 && result.contentStatus.length === 0) {
            this.setState({
              anchorEl: currentTarget,
              modalState: {
                header: getLanguageFromKey('sync_header.validation_completed', this.props.language),
                btnText: getLanguageFromKey('sync_header.share_changes', this.props.language),
                shouldShowDoneIcon: true,
                btnClick: this.shareChanges,
              },
            });
          } else {
            this.setState({
              anchorEl: currentTarget,
              modalState: {
                header: getLanguageFromKey('sync_header.describe_and_validate', this.props.language),
                descriptionText:
                  getLanguageFromKey('sync_header.describe_and_validate_submessage', this.props.language),
                btnText: getLanguageFromKey('sync_header.describe_and_validate_btnText', this.props.language),
                shouldShowCommitBox: true,
              },
            });
          }

        }
      })
    } else {
      this.setState({
        anchorEl: currentTarget,
        modalState: {
          header: getLanguageFromKey('sync_header.sharing_changes_no_access', this.props.language),
          descriptionText: getLanguageFromKey('sync_header.sharing_changes_no_access_submessage', this.props.language),
        },
      });
    }

  }

  public commitChanges = (commitMessage: string) => {
    //TODO: perform commit and pull
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;
    const commitInfoObj = {
      message: commitMessage,
      org,
      repository: service,
    };
    const url = `${altinnWindow.location.origin}/designerapi/Repository/CommitAndPushRepo`;
    fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commitInfoObj),
    })
      .then((response) => response.text())
      .then((responseData) => {
        // TODO: if everything is ok
        if (responseData) {
          this.setState({
            modalState: {
              header: getLanguageFromKey('sync_header.validation_completed', this.props.language),
              descriptionText: '',
              btnText: getLanguageFromKey('sync_header.share_changes', this.props.language),
              shouldShowDoneIcon: true,
            },
          });
        } else {
          // of merge conflikt
          this.setState({
            modalState: {
              header: getLanguageFromKey('sync_header.merge_conflict_occured', this.props.language),
              descriptionText: getLanguageFromKey('sync_header.merge_conflict_occured_submessage', this.props.language),
              btnText: getLanguageFromKey('sync_header.merge_conflict_btn', this.props.language),
              shouldShowDoneIcon: true,
            },
          });

        }
        console.log('inside second then ' + responseData);
      })
      .catch((err) => {
        console.log('inside error ' + err);
      });
  }

  public render() {
    return (
      <Grid container={true} direction='row'>
        <Grid item={true} xs={5}>
          <FetchChangesComponent
            language={this.props.language}
            fetchChanges={this.fetchChanges}
            changesInMaster={this.state.changesInMaster}
          />
          <LargePopoverComponent
            anchorEl={this.state.anchorEl}
            header={this.state.modalState.header}
            descriptionText={this.state.modalState.descriptionText}
            isLoading={this.state.modalState.isLoading}
            shouldShowDoneIcon={this.state.modalState.shouldShowDoneIcon}
            btnText={this.state.modalState.btnText}
            shouldShowCommitBox={this.state.modalState.shouldShowCommitBox}
            handleClose={this.handleClose}
            btnClick={this.state.modalState.btnMethod}
          />
        </Grid>
        <Grid item={true} xs={7}>
          <PushChangesComponent
            language={this.props.language}
            pushChanges={this.pushChanges}
            changesInLocalRepo={this.state.changesInLocalRepo}
            moreThanAnHourSinceLastPush={this.state.moreThanAnHourSinceLastPush}
            hasPushRight={this.state.hasPushRight}
          />
          <LargePopoverComponent
            anchorEl={this.state.anchorEl}
            header={this.state.modalState.header}
            descriptionText={this.state.modalState.descriptionText}
            isLoading={this.state.modalState.isLoading}
            shouldShowDoneIcon={this.state.modalState.shouldShowDoneIcon}
            btnText={this.state.modalState.btnText}
            shouldShowCommitBox={this.state.modalState.shouldShowCommitBox}
            handleClose={this.handleClose}
            btnClick={this.commitChanges}
          />
        </Grid>
      </Grid>
    );
  }
}

export default withStyles(styles)(VersionControlHeader);
