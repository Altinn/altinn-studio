import { Paper, TextField } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import { createMuiTheme, createStyles, MuiThemeProvider, withStyles, WithStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../../../../shared/src/theme/altinnStudioTheme';

const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  root: {
    backgroundColor: 'blue',
    minHeight: '100%',
    display: 'flex',
  },
  container: {

  },
  boxTop: {
    [theme.breakpoints.down('sm')]: {
      height: `calc(75vh - 55px - 36px)`, // remove 36 when old top menu is removed
    },
    [theme.breakpoints.up('md')]: {
      height: `calc(75vh - 110px - 36px)`, // remove 36 when old top menu is removed
    },
  },
  boxBottom: {
    [theme.breakpoints.down('sm')]: {
      height: `calc(25vh)`,
    },
    [theme.breakpoints.up('md')]: {
      height: `calc(25vh)`,
    },
  });

export interface IHandleMergeConflictContainerProps extends WithStyles<typeof styles> {
  checkForMergeConflict: () => void;
}

export interface IHandleMergeConflictContainerState {

}

class HandleMergeConflictContainer extends
  React.Component<IHandleMergeConflictContainerProps, IHandleMergeConflictContainerState> {

  constructor(_props: IHandleMergeConflictContainerProps) {
    super(_props);
  }

  public render() {
    const { classes } = this.props;

    return (
      <React.Fragment>
        <MuiThemeProvider theme={theme}>
          <div className={classes.root}>
            <Grid
              container={true}
              className={classes.container}
              direction='row'
              justify='flex-start'
            >
              <Grid item={true} xs={6}>
                <Paper className={classes.boxTop}>
                  Content
                  </Paper>
              </Grid>
              <Grid item={true} xs={6}>
                <Paper className={classes.boxTop}>
                  Content
                  </Paper>
              </Grid>
              <Grid item={true} xs={6}>
                <Paper className={classes.boxBottom}>
                  Content
                  </Paper>
              </Grid>
              <Grid item={true} xs={6}>
                <Paper className={classes.boxBottom}>
                  Content
                  </Paper>
              </Grid>
            </Grid>

          </div>
        </MuiThemeProvider>
      </React.Fragment >
    );
  }
}

export default withStyles(styles)(HandleMergeConflictContainer);
