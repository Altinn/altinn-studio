import {
  createTheme,
  createStyles,
  Grid,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import axios from 'axios';
import React from 'react';
import { get, post } from '../utils/networking';
import altinnTheme from '../theme/altinnStudioTheme';
import type { IAltinnWindow, IGitStatus, IContentStatus } from '../types/global';
import { getLanguageFromKey } from '../utils/language';
import postMessages from '../utils/postMessages';
import FetchChangesComponent from './fetchChanges';
import ShareChangesComponent from './shareChanges';
import CloneButton from './cloneButton';
import CloneModal from './cloneModal';
import SyncModalComponent from './syncModal';

export interface IVersionControlHeaderProps extends WithStyles<typeof styles> {
  language: any;
  type?: 'fetchButton' | 'shareButton' | 'header';
}

export interface IVersionControlHeaderState {
  changesInMaster: boolean;
  changesInLocalRepo: boolean;
  hasPushRight: boolean;
  anchorEl: any;
  modalState: any;
  mergeConflict: boolean;
  cloneModalOpen: boolean;
  cloneModalAnchor: any;
}

const theme = createTheme(altinnTheme);

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

function hasLocalChanges(result: IGitStatus) {
  return (
    result &&
    result.contentStatus.some(
      (file: IContentStatus) => file.fileStatus !== 'Ignored',
    )
  );
}

class VersionControlHeader extends React.Component<
  IVersionControlHeaderProps,
  IVersionControlHeaderState
> {
  public cancelToken = axios.CancelToken;

  public source = this.cancelToken.source();

  public componentIsMounted = false;

  constructor(_props: IVersionControlHeaderProps) {
    super(_props);
    this.state = {
      changesInMaster: false,
      changesInLocalRepo: false,
      hasPushRight: null,
      anchorEl: null,
      mergeConflict: false,
      modalState: initialModalState,
      cloneModalOpen: false,
      cloneModalAnchor: null,
    };
  }

  public componentDidMount() {
    this.componentIsMounted = true;
    this.getRepoPermissions();
  }

  public componentWillUnmount() {
    this.source.cancel('ComponentWillUnmount'); // Cancel the getRepoPermissions() get request
  }

  public getRepoPermissions = async () => {
    const { org, app } = window as Window as IAltinnWindow;
    const url = `${window.location.origin}/designer/api/v1/repos/${org}/${app}`;

    try {
      const currentRepo = await get(url, { cancelToken: this.source.token });
      this.setState({
        hasPushRight: currentRepo.permissions.push,
      });
    } catch (err) {
      if (axios.isCancel(err)) {
        // This is handy when debugging axios cancelations when unmounting
        // TODO: Fix other cancelations when unmounting in this component
        // console.info('Component did unmount. Get canceled.');
      } else {
        // TODO: Handle error
        console.error('getRepoPermissions failed', err);
      }
    }
  };

  public getStatus(callbackFunc?: any) {
    const { org, app } = window as Window as IAltinnWindow;
    const url = `${window.location.origin}/designer/api/v1/repos/${org}/${app}/status`;
    get(url)
      .then((result: IGitStatus) => {
        if (this.componentIsMounted) {
          this.setState({
            mergeConflict: result.repositoryStatus === 'MergeConflict',
          });
          if (callbackFunc) {
            callbackFunc(result);
          } else if (result) {
            this.setState({
              changesInMaster: result.behindBy !== 0,
              changesInLocalRepo: hasLocalChanges(result),
            });
          }
        }
      })
      .catch(() => {
        if (this.state.modalState.isLoading) {
          this.setState((prevState) => ({
            modalState: {
              header: getLanguageFromKey(
                'sync_header.repo_is_offline',
                this.props.language,
              ),
              isLoading: !prevState.modalState.isLoading,
            },
          }));
        }
      });
  }

  public handleClose = () => {
    if (!this.state.mergeConflict) {
      this.setState({
        anchorEl: null,
      });
    }
  };

  public fetchChanges = (currentTarget: any) => {
    this.setState({
      anchorEl: currentTarget,
      modalState: {
        header: getLanguageFromKey(
          'sync_header.fetching_latest_version',
          this.props.language,
        ),
        isLoading: true,
      },
    });

    const { org, app } = window as Window as IAltinnWindow;
    const url = `${window.location.origin}/designer/api/v1/repos/${org}/${app}/pull`;

    get(url)
      .then((result: any) => {
        if (this.componentIsMounted) {
          if (result.repositoryStatus === 'Ok') {
            // if pull was successfull, show app is updated message
            this.setState({
              changesInMaster: result.behindBy !== 0,
              changesInLocalRepo: hasLocalChanges(result),
              modalState: {
                header: getLanguageFromKey(
                  'sync_header.service_updated_to_latest',
                  this.props.language,
                ),
                isLoading: false,
                shouldShowDoneIcon: true,
              },
            });
            // force refetch  files
            window.postMessage(postMessages.refetchFiles, window.location.href);
            this.forceRepoStatusCheck();
          } else if (result.repositoryStatus === 'CheckoutConflict') {
            // if pull gives merge conflict, show user needs to commit message
            this.setState({
              modalState: {
                header: getLanguageFromKey(
                  'sync_header.changes_made_samme_place_as_user',
                  this.props.language,
                ),
                descriptionText: [
                  getLanguageFromKey(
                    'sync_header.changes_made_samme_place_submessage',
                    this.props.language,
                  ),
                  getLanguageFromKey(
                    'sync_header.changes_made_samme_place_subsubmessage',
                    this.props.language,
                  ),
                ],
                btnText: getLanguageFromKey(
                  'sync_header.fetch_changes_btn',
                  this.props.language,
                ),
                shouldShowCommitBox: true,
                btnMethod: this.commitChanges,
              },
            });
          }
        }
      })
      .catch(() => {
        if (this.state.modalState.isLoading) {
          this.setState((prevState) => ({
            modalState: {
              header: getLanguageFromKey(
                'sync_header.repo_is_offline',
                this.props.language,
              ),
              isLoading: !prevState.modalState.isLoading,
            },
          }));
        }
      });
  };

  public shareChanges = (currentTarget: any, showNothingToPush: boolean) => {
    if (showNothingToPush) {
      this.setState({
        anchorEl: currentTarget,
        modalState: {
          shouldShowDoneIcon: true,
          header: getLanguageFromKey(
            'sync_header.nothing_to_push',
            this.props.language,
          ),
        },
      });
    }
    if (this.state.hasPushRight === true) {
      this.setState({
        anchorEl: currentTarget,
        modalState: {
          header: getLanguageFromKey(
            'sync_header.controlling_service_status',
            this.props.language,
          ),
          isLoading: true,
        },
      });
      this.getStatus((result: IGitStatus) => {
        if (result) {
          if (!hasLocalChanges(result) && result.aheadBy === 0) {
            // if user has nothing to commit => show nothing to push message
            this.setState({
              anchorEl: currentTarget,
              modalState: {
                shouldShowDoneIcon: true,
                header: getLanguageFromKey(
                  'sync_header.nothing_to_push',
                  this.props.language,
                ),
              },
            });
          } else if (!hasLocalChanges(result) && result.aheadBy > 0) {
            this.setState({
              anchorEl: currentTarget,
              modalState: {
                header: getLanguageFromKey(
                  'sync_header.validation_completed',
                  this.props.language,
                ),
                btnText: getLanguageFromKey(
                  'sync_header.share_changes',
                  this.props.language,
                ),
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
                header: getLanguageFromKey(
                  'sync_header.describe_and_validate',
                  this.props.language,
                ),
                descriptionText: [
                  getLanguageFromKey(
                    'sync_header.describe_and_validate_submessage',
                    this.props.language,
                  ),
                  getLanguageFromKey(
                    'sync_header.describe_and_validate_subsubmessage',
                    this.props.language,
                  ),
                ],
                btnText: getLanguageFromKey(
                  'sync_header.describe_and_validate_btnText',
                  this.props.language,
                ),
                shouldShowCommitBox: true,
                isLoading: false,
                btnMethod: this.commitChanges,
              },
            });
          }
        }
      });
    } else if (this.state.hasPushRight === false) {
      // if user don't have push rights, show modal stating no access to share changes
      this.setState({
        anchorEl: currentTarget,
        modalState: {
          header: getLanguageFromKey(
            'sync_header.sharing_changes_no_access',
            this.props.language,
          ),
          // eslint-disable-next-line max-len
          descriptionText: [
            getLanguageFromKey(
              'sync_header.sharing_changes_no_access_submessage',
              this.props.language,
            ),
          ],
        },
      });
    }
  };

  public pushChanges = () => {
    this.setState({
      modalState: {
        header: getLanguageFromKey(
          'sync_header.sharing_changes',
          this.props.language,
        ),
        isLoading: true,
      },
    });

    const { org, app } = window as Window as IAltinnWindow;
    const url = `${window.location.origin}/designer/api/v1/repos/${org}/${app}/push`;

    post(url)
      .then(() => {
        if (this.componentIsMounted) {
          this.setState({
            changesInMaster: false,
            changesInLocalRepo: false,
            modalState: {
              header: getLanguageFromKey(
                'sync_header.sharing_changes_completed',
                this.props.language,
              ),
              descriptionText: [
                getLanguageFromKey(
                  'sync_header.sharing_changes_completed_submessage',
                  this.props.language,
                ),
              ],
              shouldShowDoneIcon: true,
            },
          });
        }
      })
      .catch(() => {
        if (this.state.modalState.isLoading) {
          this.setState((prevState) => ({
            modalState: {
              header: getLanguageFromKey(
                'sync_header.repo_is_offline',
                this.props.language,
              ),
              isLoading: !prevState.modalState.isLoading,
            },
          }));
        }
      });
    this.forceRepoStatusCheck();
  };

  public commitChanges = (commitMessage: string) => {
    this.setState({
      modalState: {
        header: getLanguageFromKey(
          'sync_header.validating_changes',
          this.props.language,
        ),
        descriptionText: [],
        isLoading: true,
      },
    });

    const { org, app } = window as Window as IAltinnWindow;
    const options = {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    };
    const bodyData = JSON.stringify({
      message: commitMessage,
      org,
      repository: app,
    });

    const url = `${window.location.origin}/designer/api/v1/repos/${org}/${app}/commit`;
    const pullUrl = `${window.location.origin}/designer/api/v1/repos/${org}/${app}/pull`;
    post(url, bodyData, options)
      .then(() => {
        get(pullUrl)
          .then((result: any) => {
            if (this.componentIsMounted) {
              // if pull was successfull, show app updated message
              if (result.repositoryStatus === 'Ok') {
                this.setState({
                  modalState: {
                    header: getLanguageFromKey(
                      'sync_header.validation_completed',
                      this.props.language,
                    ),
                    descriptionText: [],
                    btnText: getLanguageFromKey(
                      'sync_header.share_changes',
                      this.props.language,
                    ),
                    shouldShowDoneIcon: true,
                    btnMethod: this.pushChanges,
                  },
                });
              } else if (result.repositoryStatus === 'MergeConflict') {
                // if pull resulted in a mergeconflict, show mergeconflict message
                this.setState({
                  mergeConflict: true,
                  modalState: {
                    header: getLanguageFromKey(
                      'sync_header.merge_conflict_occured',
                      this.props.language,
                    ),
                    // eslint-disable-next-line max-len
                    descriptionText: [
                      getLanguageFromKey(
                        'sync_header.merge_conflict_occured_submessage',
                        this.props.language,
                      ),
                    ],
                    btnText: getLanguageFromKey(
                      'sync_header.merge_conflict_btn',
                      this.props.language,
                    ),
                    btnMethod: this.forceRepoStatusCheck,
                  },
                });
              }
            }
          })
          .catch(() => {
            if (this.state.modalState.isLoading) {
              this.setState((prevState) => ({
                modalState: {
                  header: getLanguageFromKey(
                    'sync_header.repo_is_offline',
                    this.props.language,
                  ),
                  isLoading: !prevState.modalState.isLoading,
                },
              }));
            }
          });
      })
      .catch(() => {
        if (this.state.modalState.isLoading) {
          this.setState((prevState) => ({
            modalState: {
              header: getLanguageFromKey(
                'sync_header.repo_is_offline',
                this.props.language,
              ),
              isLoading: !prevState.modalState.isLoading,
            },
          }));
        }
      });
  };

  public forceRepoStatusCheck = () => {
    window.postMessage('forceRepoStatusCheck', window.location.href);
  };

  public renderSyncModalComponent = () => {
    return (
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
    );
  };

  public closeCloneModal = () => {
    this.setState({
      cloneModalOpen: false,
    });
  };

  public renderCloneModal = () => {
    return (
      <CloneModal
        anchorEl={this.state.cloneModalAnchor}
        open={this.state.cloneModalOpen}
        onClose={this.closeCloneModal}
        language={this.props.language}
      />
    );
  };

  public openCloneModal = (event: React.MouseEvent) => {
    this.setState({
      cloneModalOpen: true,
      cloneModalAnchor: event.currentTarget,
    });
  };

  public render() {
    const { classes } = this.props;
    const type = this.props.type || 'header';

    return (
      <React.Fragment>
        {type === 'header' ? (
          <Grid
            container={true}
            direction='row'
            className={classes.headerStyling}
            justifyContent='flex-start'
            data-testid='version-control-header'
          >
            <Grid item={true} style={{ marginRight: '24px' }}>
              <CloneButton
                onClick={this.openCloneModal}
                buttonText={getLanguageFromKey(
                  'sync_header.clone',
                  this.props.language,
                )}
              />
            </Grid>
            <Grid item={true} style={{ marginRight: '24px' }}>
              <FetchChangesComponent
                changesInMaster={this.state.changesInMaster}
                fetchChanges={this.fetchChanges}
                language={this.props.language}
              />
            </Grid>
            <Grid item={true}>
              <ShareChangesComponent
                changesInLocalRepo={this.state.changesInLocalRepo}
                hasMergeConflict={this.state.mergeConflict}
                hasPushRight={this.state.hasPushRight}
                language={this.props.language}
                shareChanges={this.shareChanges}
              />
            </Grid>
            {this.renderSyncModalComponent()}
            {this.renderCloneModal()}
          </Grid>
        ) : type === 'fetchButton' ? (
          <div data-testid='version-control-fetch-button'>
            <FetchChangesComponent
              changesInMaster={this.state.changesInMaster}
              fetchChanges={this.fetchChanges}
              language={this.props.language}
            />
            {this.renderSyncModalComponent()}
          </div>
        ) : type === 'shareButton' ? (
          <div data-testid='version-control-share-button'>
            <ShareChangesComponent
              buttonOnly={true}
              changesInLocalRepo={this.state.changesInLocalRepo}
              hasMergeConflict={this.state.mergeConflict}
              hasPushRight={this.state.hasPushRight}
              language={this.props.language}
              shareChanges={this.shareChanges}
            />
            {this.renderSyncModalComponent()}
          </div>
        ) : null}
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(VersionControlHeader);

export const VersionControlContainer = withStyles(styles)(VersionControlHeader);
