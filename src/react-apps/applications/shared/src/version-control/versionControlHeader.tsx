import { createMuiTheme, createStyles, Grid, WithStyles, withStyles } from '@material-ui/core';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme'
import FetchChangesComponent from '../version-control/fetchChanges';
import PushChangesComponent from '../version-control/pushChanges';

export interface IVersionControlHeaderProps extends WithStyles<typeof styles> {

}

export interface IVersionControlHeaderState {
  changesInMaster: boolean;
  changesInLocalRepo: boolean;
  moreThanAnHourSinceLastPush: boolean;
  hasPushRight: boolean;
}

const theme = createMuiTheme(altinnTheme);

const styles = createStyles({

});

class VersionControlHeader extends React.Component<IVersionControlHeaderProps, IVersionControlHeaderState> {
  constructor(_props: IVersionControlHeaderProps) {
    super(_props);
    this.state = {
      changesInMaster: false,
      changesInLocalRepo: false,
      moreThanAnHourSinceLastPush: false,
      // TODO: denne må fikses
      hasPushRight: true,
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

  public fetchChanges() {
    console.log('fetching changes');
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;
    const url = `${altinnWindow.location.origin}/designerapi/Repository/PullRepo?owner=${org}&repository=${service}`;
    fetch(url)
      .then(
        (result) => {
          console.log('inside then' + result.status + result.ok);
          if (result.ok) {
            //TODO: update status?
          }
          else {
            //TODO: what?
          }

        },
        (error) => {
          console.log('inside then' + error);
        },
      );
  }

  public pushChanges() {
    console.log('push changes');
  }

  public render() {
    return (
      <Grid container={true} direction='row'>
        <Grid item={true} xs={5}>
          <FetchChangesComponent
            fetchChanges={this.fetchChanges}
            changesInMaster={this.state.changesInMaster}
          />
        </Grid>
        <Grid item={true} xs={7}>
          <PushChangesComponent
            pushChanges={this.pushChanges}
            changesInLocalRepo={this.state.changesInLocalRepo}
            moreThanAnHourSinceLastPush={this.state.moreThanAnHourSinceLastPush}
            hasPushRight={this.state.hasPushRight}
          />
        </Grid>
      </Grid>
    );
  }
}

export default withStyles(styles)(VersionControlHeader);
