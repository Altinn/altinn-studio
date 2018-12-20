import { createMuiTheme, createStyles, Grid, WithStyles, withStyles } from '@material-ui/core';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';
import { getLanguageFromKey } from '../utils/language';
import FetchChangesComponent from '../version-control/fetchChanges';
import ShareChangesComponent from '../version-control/shareChanges';
import LargePopoverComponent from './largePopover';

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
  mergeConflict: boolean;
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
      mergeConflict: false,
      modalState: initialState,
    };
  }

  public performAPIFetch(url: string, callbackFunc: any, object?: any) {
    fetch(url, object)
      .then((response) => {
        return response.text().then((text: any) => {
          return text ? JSON.parse(text) : {};
        });
      })
      .then(
        (result) => {
          callbackFunc(result);
        },
        (error) => {
          console.error('Something went wrong: ' + error);
        },
      );
  }

  public getStatus(callbackFunc?: any) {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;
    const url = `${altinnWindow.location.origin}/designerapi/Repository/RepoStatus?owner=${org}&repository=${service}`;
    this.performAPIFetch(url, (result: any) => {
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
      // TODO: correct url when method done
      const url = `${altinnWindow.location.origin}/designerapi/Repository/Branches?owner=${org}&repo=${service}`;
      this.performAPIFetch(url, (result: any) => {
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
    const { service } = altinnWindow;
    const url = `${altinnWindow.location.origin}/designerapi/Repository/Search`;
    this.performAPIFetch(url, (result: any) => {
      if (result) {
        const currentRepo = result.filter((e: any) => e.name === service);
        this.setState({
          hasPushRight: currentRepo.length > 0 ? currentRepo[0].permissions.push : false,
        });
      }
    });
  }

  public handleClose = () => {
    if (!this.state.mergeConflict) {
      this.setState({
        anchorEl: null,
      });
    }
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
    const url = `${altinnWindow.location.origin}/designerapi/Repository/Pull?owner=${org}&repository=${service}`;

    this.performAPIFetch(url, (result: any) => {
      if (result.repositoryStatus === 'Ok') {
        // if pull was successfull, show service is updated message
        this.setState({
          changesInMaster: result.behindBy === 0 ? false : true,
          changesInLocalRepo: result.contentStatus.length > 0 ? true : false,
          modalState: {
            header: getLanguageFromKey('sync_header.service_updated_to_latest', this.props.language),
            descriptionText:
              getLanguageFromKey('sync_header.service_updated_to_latest_submessage', this.props.language),
            isLoading: false,
            shouldShowDoneIcon: true,
          },
        });
      } else if (result.repositoryStatus === 'CheckoutConflict') {
        // if pull gives merge conflict, show user needs to commit message
        this.setState({
          modalState: {
            header: getLanguageFromKey('sync_header.describe_and_validate', this.props.language),
            descriptionText:
              getLanguageFromKey('sync_header.describe_and_validate_submessage', this.props.language),
            btnText: getLanguageFromKey('sync_header.describe_and_validate_btnText', this.props.language),
            shouldShowCommitBox: true,
            btnMethod: this.commitChanges,
          },
        });
      }
    });
  }

  public shareChanges = (currentTarget: any) => {
    if (this.state.hasPushRight) {
      this.getStatus((result: any) => {
        if (result) {
          // if user is ahead with no changes to commit, show share changes modal
          if (result.aheadBy > 0 && result.contentStatus.length === 0) {
            this.setState({
              anchorEl: currentTarget,
              modalState: {
                header: getLanguageFromKey('sync_header.validation_completed', this.props.language),
                btnText: getLanguageFromKey('sync_header.share_changes', this.props.language),
                shouldShowDoneIcon: true,
                btnMethod: this.pushChanges,
              },
            });
          } else {
            // if user has changes to share, show write commit message modal
            this.setState({
              anchorEl: currentTarget,
              modalState: {
                header: getLanguageFromKey('sync_header.describe_and_validate', this.props.language),
                descriptionText:
                  getLanguageFromKey('sync_header.describe_and_validate_submessage', this.props.language),
                btnText: getLanguageFromKey('sync_header.describe_and_validate_btnText', this.props.language),
                shouldShowCommitBox: true,
                btnMethod: this.commitChanges,
              },
            });
          }

        }
      });
    } else {
      // if user don't have push rights, show modal stating no access to share changes
      this.setState({
        anchorEl: currentTarget,
        modalState: {
          header: getLanguageFromKey('sync_header.sharing_changes_no_access', this.props.language),
          descriptionText: getLanguageFromKey('sync_header.sharing_changes_no_access_submessage', this.props.language),
        },
      });
    }
  }

  public pushChanges = () => {
    this.setState({
      modalState: {
        header: getLanguageFromKey('sync_header.sharing_changes', this.props.language),
        isLoading: true,
      },
    });

    const requestObj = {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    };

    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;
    const url = `${altinnWindow.location.origin}/designerapi/Repository/Push?owner=${org}&repository=${service}`;

    this.performAPIFetch(url, (result: any) => {
      this.setState({
        changesInMaster: false,
        changesInLocalRepo: false,
        modalState: {
          header: getLanguageFromKey('sync_header.sharing_changes_completed', this.props.language),
          descriptionText:
            getLanguageFromKey('sync_header.sharing_changes_completed_submessage', this.props.language),
          shouldShowDoneIcon: true,
        },
      });
    }, requestObj);
  }

  public commitChanges = (commitMessage: string) => {
    this.setState({
      modalState: {
        header: getLanguageFromKey('sync_header.validating_changes', this.props.language),
        descriptionText: '',
        isLoading: true,
      },
    });

    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;
    const commitObject = {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: commitMessage,
        org,
        repository: service,
      }),
    };

    const url = `${altinnWindow.location.origin}/designerapi/Repository/Commit`;
    const pullUrl = `${altinnWindow.location.origin}/designerapi/Repository/Pull?owner=${org}&repository=${service}`;
    this.performAPIFetch(url, (commitResult: any) => {
      this.performAPIFetch(pullUrl, (result: any) => {
        // if pull was successfull, show service updated message
        if (result.repositoryStatus === 'Ok') {
          this.setState({
            modalState: {
              header: getLanguageFromKey('sync_header.validation_completed', this.props.language),
              descriptionText: '',
              btnText: getLanguageFromKey('sync_header.share_changes', this.props.language),
              shouldShowDoneIcon: true,
              btnMethod: this.pushChanges,
            },
          });
        } else if (result.repositoryStatus === 'MergeConflict') {
          // if pull resulted in a mergeconflict, show mergeconflict message
          this.setState({
            mergeConflict: true,
            modalState: {
              header: getLanguageFromKey('sync_header.merge_conflict_occured', this.props.language),
              descriptionText: getLanguageFromKey('sync_header.merge_conflict_occured_submessage', this.props.language),
              btnText: getLanguageFromKey('sync_header.merge_conflict_btn', this.props.language),
              btnMethod: this.redirectToMergeConflictPage,
            },
          });
        }
      });
    }, commitObject);
  }

  public redirectToMergeConflictPage() {
    // TODO: redirect to merge page
  }

  public render() {
    return (
      <Grid container={true} direction='row' >
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
          <ShareChangesComponent
            language={this.props.language}
            shareChanges={this.shareChanges}
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
            btnClick={this.state.modalState.btnMethod}
          />
        </Grid>
      </Grid>
    );
  }
}

export default withStyles(styles)(VersionControlHeader);
