import { createMuiTheme, createStyles, Grid, WithStyles, withStyles } from '@material-ui/core';
import * as React from 'react';
import { get, post } from '../../../shared/src/utils/networking';
import altinnTheme from '../theme/altinnStudioTheme';
import { getLanguageFromKey } from '../utils/language';
import FetchChangesComponent from '../version-control/fetchChanges';
import ShareChangesComponent from '../version-control/shareChanges';
import SyncModalComponent from './syncModal';

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
  timeoutIsRunning: boolean;
}

const theme = createMuiTheme(altinnTheme);

const styles = createStyles({
  headerStyling: {
    background: theme.altinnPalette.primary.greyLight,
    paddingTop: 10,
  },
});

const initialModalState = {
  header: '',
  descriptionText: [] as string[],
  isLoading: '',
  shouldShowDoneIcon: false,
  btnText: '',
  shouldShowCommitBox: false,
  btnMethod: '',
};

class VersionControlHeader extends React.Component<IVersionControlHeaderProps, IVersionControlHeaderState> {
  public interval: any;
  public _isMounted = false;
  public timeout: any;
  constructor(_props: IVersionControlHeaderProps) {
    super(_props);
    this.state = {
      changesInMaster: false,
      changesInLocalRepo: false,
      moreThanAnHourSinceLastPush: false,
      hasPushRight: false,
      anchorEl: null,
      mergeConflict: false,
      modalState: initialModalState,
      timeoutIsRunning: false,
    };
  }

  public getStatus(callbackFunc?: any) {
    const altinnWindow: any = window as any;
    const { org, service } = altinnWindow;
    const url = `${altinnWindow.location.origin}/designerapi/Repository/RepoStatus?owner=${org}&repository=${service}`;
    get(url).then((result: any) => {
      if (this._isMounted) {
        this.setState({
          mergeConflict: result.repositoryStatus === 'MergeConflict',
        });
        if (callbackFunc) {
          callbackFunc(result);
        } else {
          if (result) {
            this.setState({
              changesInMaster: result.behindBy !== 0,
              changesInLocalRepo: result.contentStatus.length > 0,
            });
          }
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
      const altinnWindow: any = window as any;
      const { org, service } = altinnWindow;
      // tslint:disable-next-line:max-line-length
      const url = `${altinnWindow.location.origin}/designerapi/Repository/GetLatestCommitFromCurrentUser?owner=${org}&repository=${service}`;
      get(url).then((result: any) => {
        if (this._isMounted && result) {
          const diff = new Date().getTime() - new Date(result.commiter.when).getTime();
          const oneHour = 60 * 60 * 1000;
          this.setState({
            moreThanAnHourSinceLastPush: oneHour < diff,
          });
        }
      });
    }
  }

  public componentDidMount() {
    this._isMounted = true;
    // check status every 5 min
    this.interval = setInterval(() => this.updateStateOnIntervals(), 300000);
    this.getStatus();
    this.getRepoRights();
    this.getLastPush();
    window.addEventListener('message', this.changeToRepoOccured);
  }

  public changeToRepoOccured = (event: any) => {
    if (event.data === 'SAVED' && this._isMounted && !this.state.timeoutIsRunning) {
      this.setState({
        timeoutIsRunning: true,
      });
      this.timeout = setTimeout(() => {
        this.setState({
          timeoutIsRunning: false,
        });
        this.getStatus();
      }, 10000);
    }
  }

  public componentWillUnmount() {
    clearInterval(this.interval);
    this._isMounted = false;
    clearTimeout(this.timeout);
    window.removeEventListener('message', this.changeToRepoOccured);
  }

  public getRepoRights() {
    const altinnWindow: any = window as any;
    const { service } = altinnWindow;
    const url = `${altinnWindow.location.origin}/designerapi/Repository/Search`;
    get(url).then((result: any) => {
      if (this._isMounted && result) {
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

    const altinnWindow: any = window as any;
    const { org, service } = altinnWindow;
    const url = `${altinnWindow.location.origin}/designerapi/Repository/Pull?owner=${org}&repository=${service}`;

    get(url).then((result: any) => {
      if (this._isMounted) {
        if (result.repositoryStatus === 'Ok') {
          // if pull was successfull, show service is updated message
          this.setState({
            changesInMaster: result.behindBy !== 0,
            changesInLocalRepo: result.contentStatus.length > 0,
            modalState: {
              header: getLanguageFromKey('sync_header.service_updated_to_latest', this.props.language),
              isLoading: false,
              shouldShowDoneIcon: true,
            },
          });
          // force refetch  files
          window.postMessage('NEWDATA', window.location.href);
        } else if (result.repositoryStatus === 'CheckoutConflict') {
          // if pull gives merge conflict, show user needs to commit message
          this.setState({
            modalState: {
              header: getLanguageFromKey('sync_header.changes_made_samme_place_as_user', this.props.language),
              descriptionText:
                [getLanguageFromKey('sync_header.changes_made_samme_place_submessage', this.props.language),
                getLanguageFromKey('sync_header.changes_made_samme_place_subsubmessage', this.props.language)],
              btnText: getLanguageFromKey('sync_header.hent_endringer_btn', this.props.language),
              shouldShowCommitBox: true,
              btnMethod: this.commitChanges,
            },
          });
        }
      }
    });
  }

  public shareChanges = (currentTarget: any) => {
    if (this.state.hasPushRight) {
      this.setState({
        anchorEl: currentTarget,
        modalState: {
          header: getLanguageFromKey('sync_header.controlling_service_status', this.props.language),
          isLoading: true,
        },
      });
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
                isLoading: false,
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
                  [getLanguageFromKey('sync_header.describe_and_validate_submessage', this.props.language),
                  getLanguageFromKey('sync_header.describe_and_validate_subsubmessage', this.props.language)],
                btnText: getLanguageFromKey('sync_header.describe_and_validate_btnText', this.props.language),
                shouldShowCommitBox: true,
                isLoading: false,
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
          // tslint:disable-next-line:max-line-length
          descriptionText: [getLanguageFromKey('sync_header.sharing_changes_no_access_submessage', this.props.language)],
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

    const altinnWindow: any = window as any;
    const { org, service } = altinnWindow;
    const url = `${altinnWindow.location.origin}/designerapi/Repository/Push?owner=${org}&repository=${service}`;

    post(url).then((result: any) => {
      if (this._isMounted) {
        this.setState({
          changesInMaster: false,
          changesInLocalRepo: false,
          moreThanAnHourSinceLastPush: true,
          modalState: {
            header: getLanguageFromKey('sync_header.sharing_changes_completed', this.props.language),
            descriptionText:
              [getLanguageFromKey('sync_header.sharing_changes_completed_submessage', this.props.language)],
            shouldShowDoneIcon: true,
          },
        });
      }
    });
  }

  public commitChanges = (commitMessage: string) => {
    this.setState({
      modalState: {
        header: getLanguageFromKey('sync_header.validating_changes', this.props.language),
        descriptionText: [],
        isLoading: true,
      },
    });

    const altinnWindow: any = window as any;
    const { org, service } = altinnWindow;
    const options = {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    };
    const bodyData = JSON.stringify({ message: commitMessage, org, repository: service });

    const url = `${altinnWindow.location.origin}/designerapi/Repository/Commit`;
    const pullUrl = `${altinnWindow.location.origin}/designerapi/Repository/Pull?owner=${org}&repository=${service}`;
    post(url, bodyData, options).then((commitResult: any) => {
      get(pullUrl).then((result: any) => {
        if (this._isMounted) {
          // if pull was successfull, show service updated message
          if (result.repositoryStatus === 'Ok') {
            this.setState({
              modalState: {
                header: getLanguageFromKey('sync_header.validation_completed', this.props.language),
                descriptionText: [],
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
                // tslint:disable-next-line:max-line-length
                descriptionText: [getLanguageFromKey('sync_header.merge_conflict_occured_submessage', this.props.language)],
                btnText: getLanguageFromKey('sync_header.merge_conflict_btn', this.props.language),
                btnMethod: this.redirectToMergeConflictPage,
              },
            });
          }
        }
      });
    });
  }

  public redirectToMergeConflictPage = () => {
    window.postMessage('forceRepoStatusCheck', window.location.href);
  }

  public render() {
    const { classes } = this.props;
    return (
      <React.Fragment>
        <Grid container={true} direction='row' className={classes.headerStyling}>
          <Grid item={true} xs={5}>
            <FetchChangesComponent
              language={this.props.language}
              fetchChanges={this.fetchChanges}
              changesInMaster={this.state.changesInMaster}
            />
          </Grid>
          <Grid item={true} xs={7}>
            <ShareChangesComponent
              language={this.props.language}
              shareChanges={this.shareChanges}
              changesInLocalRepo={this.state.changesInLocalRepo}
              moreThanAnHourSinceLastPush={this.state.moreThanAnHourSinceLastPush}
              hasPushRight={this.state.hasPushRight}
              hasMergeConflict={this.state.mergeConflict}
            />
          </Grid>
          <SyncModalComponent
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
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(VersionControlHeader);
