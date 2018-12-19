import { createMuiTheme, createStyles, Grid, WithStyles, withStyles, Button } from '@material-ui/core';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme'
import FetchChangesComponent from '../version-control/fetchChanges';
import PushChangesComponent from '../version-control/pushChanges';
import LargePopoverComponent from './largePopover';
import { getLanguageFromKey } from '../utils/language';

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
}

class VersionControlHeader extends React.Component<IVersionControlHeaderProps, IVersionControlHeaderState> {
  constructor(_props: IVersionControlHeaderProps) {
    super(_props);
    this.state = {
      changesInMaster: false,
      changesInLocalRepo: false,
      moreThanAnHourSinceLastPush: false,
      // TODO: denne må fikses
      hasPushRight: true,
      anchorEl: null,
      modalState: initialState,
    };
  }

  public componentWillMount() {
    console.log('componentWillMount');
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;
    const url = `${altinnWindow.location.origin}/designerapi/Repository/RepoStatus?org=${org}&repository=${service}`;
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
          if (result) {
            this.setState({
              changesInMaster: result.behindBy === 0 ? false : true,
              changesInLocalRepo: result.contentStatus.length > 0 ? true : false,
            });
          }
        },
        (error) => {
          console.log('inside then' + error);
        },
      );
  }

  public handleClose = () => {
    this.setState({
      anchorEl: null,
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
    console.log('fetching changes');
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;
    const url = `${altinnWindow.location.origin}/designerapi/Repository/PullRepo?owner=${org}&repository=${service}`;
    fetch(url)
      .then(
        (result) => {
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
          }
        },
        (error) => {
          console.log('Something went wrong: ' + error);
        },
      );
  }

  public pushChanges = (currentTarget: any) => {
    if (this.state.hasPushRight) {
      this.setState({
        anchorEl: currentTarget,
        modalState: {
          header: getLanguageFromKey('sync_header.describe_and_validate', this.props.language),
          descriptionText: getLanguageFromKey('sync_header.describe_and_validate_submessage', this.props.language),
          btnText: getLanguageFromKey('sync_header.describe_and_validate_btnText', this.props.language),
          shouldShowCommitBox: true,
        },
      });
    } else {
      this.setState({
        anchorEl: currentTarget,
        modalState: {
          header: getLanguageFromKey('sync_header.describe_and_validate', this.props.language),
          descriptionText: getLanguageFromKey('sync_header.describe_and_validate_submessage', this.props.language),
          btnText: getLanguageFromKey('sync_header.describe_and_validate_btnText', this.props.language),
          shouldShowCommitBox: true,
        },
      });
    }

  }

  public commitChanges = (commitMessage: string) => {
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
