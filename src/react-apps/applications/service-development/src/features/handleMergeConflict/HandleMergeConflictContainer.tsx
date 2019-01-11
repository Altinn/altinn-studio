import { Paper, Typography } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import { createMuiTheme, createStyles, MuiThemeProvider, withStyles, WithStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import { connect } from 'react-redux';
import AltinnIcon from '../../../../shared/src/components/AltinnIcon';
import altinnTheme from '../../../../shared/src/theme/altinnStudioTheme';
import { get } from '../../../../shared/src/utils/networking';
import { makeGetRepoStatusSelector } from '../handleMergeConflict/handleMergeConflictSelectors';
import HandleMergeConflictDiscardAllChanges from './components/HandleMergeConflictDiscardAllChanges';
import HandleMergeConflictFileList from './components/HandleMergeConflictFileList';
import HandleMergeConflictValidateChanges from './components/HandleMergeConflictValidateChanges';

const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  root: {
    display: 'flex',
    backgroundColor: '#dddddd',
    minHeight: '100%',
    paddingTop: 60,
    paddingRight: 60,
    paddingBottom: 10,
    paddingLeft: 60,
  },
  container: {
  },
  boxWithFiles: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.25)',
  },
  boxWithMonaco: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.25)',
  },
  boxWithForkast: {
  },
  boxWithIcon: {
    textAlign: 'center',
  },
  boxTop: {
    [theme.breakpoints.down('sm')]: {
      height: `calc(75vh)`, // remove 36 when old top menu is removed
    },
    [theme.breakpoints.up('md')]: {
      height: `calc(100vh - 110px - 120px - 130px - 36px)`, // remove 36 when old top menu is removed
    },
  },
  boxBottom: {
    // [theme.breakpoints.down('sm')]: {
    //   height: `calc(25vh)`,
    // },
    // [theme.breakpoints.up('md')]: {
    //   height: `calc(25vh)`,
    // },
    height: 130,
    marginTop: 20,
    // backgroundColor: '#cccccc',
  },
  fileWithMergeConflict: {
    '&:hover': {
      color: '#0062BA',
      textDecoration: 'underline',
    },
  },
  paper: {
    // padding: 1.5,
    boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.25)',
  },
  title: {
    marginBottom: 16,
  },
});

export interface IHandleMergeConflictContainerProps extends WithStyles<typeof styles> {
  checkForMergeConflict: () => void;
  language: any;
  repoStatus: any;
}

export interface IHandleMergeConflictContainerState {
}

class HandleMergeConflictContainer extends
  React.Component<IHandleMergeConflictContainerProps, IHandleMergeConflictContainerState> {

  constructor(_props: IHandleMergeConflictContainerProps) {
    super(_props);
  }

  public discardAllChanges() {
    const altinnWindow: any = window as any;
    const { org, service } = altinnWindow;
    const url = `${altinnWindow.location.origin}
      /designerapi/Repository/DiscardLocalChanges?owner=${org}&repository=${service}`;
    get(url).then((result: any) => {
      console.log('discard result', result);
    });
  }

  public renderFileWithMergeConflict1 = (item: any): JSX.Element => {
    const { classes } = this.props;
    return (
      <Grid
        container={true}
      >
        <Grid
          item={true}
          xs={1}
          className={classes.boxWithIcon}
        >
          <AltinnIcon
            isActive={true}
            iconClass='ai ai-circlecancel'
            iconColor='#022F51'
            iconSize={16}
          />
        </Grid>
        <Grid
          item={true}
          xs={6}
          className={classes.fileWithMergeConflict}
        >
          {item.filePath}
        </Grid>

      </Grid>
    );
  }

  public render() {
    const { classes, language, repoStatus } = this.props;

    return (
      <React.Fragment>
        <MuiThemeProvider theme={theme}>
          <div className={classes.root} id='handleMergeConflictContainer'>

            <Grid
              container={true}
              className={classes.container}
              justify='flex-start'
              id='grid1'
            >
              <Grid
                item={true}
                xs={12}
                className={classes.title}
              >
                <Typography variant='h1'>
                  Filer med mergekonflikt
                </Typography>
              </Grid>

              <Grid
                container={true}
                item={true}
                xs={12}
                direction='row'
                className={classes.boxTop}
                spacing={8}
              >
                <Grid item={true} xs={4}>
                  <Paper className={classNames(classes.paper, classes.boxTop)} square={true}>

                    <HandleMergeConflictFileList
                      repoStatus={repoStatus}
                      language={language}
                    />
                  </Paper>
                </Grid>

                <Grid item={true} xs={8}>
                  <Paper className={classes.paper} square={true}>
                    Monacos
                  </Paper>
                </Grid>

              </Grid>
              {/* Bottom grid */}
              <Grid
                container={true}
                item={true}
                xs={12}
                alignItems='center'
                className={classes.boxBottom}
              >
                <Grid item={true} xs={4} className={classes.boxWithForkast}>
                  <HandleMergeConflictDiscardAllChanges
                    language={language}
                  />
                </Grid>

                <Grid item={true} xs={8}>
                  <HandleMergeConflictValidateChanges
                    language={language}
                    repoStatus={this.props.repoStatus}
                  />
                </Grid>
              </Grid>

            </Grid>
          </div>
        </MuiThemeProvider>
      </React.Fragment >
    );
  }
}

const makeMapStateToProps = () => {
  const GetRepoStatusSelector = makeGetRepoStatusSelector();
  const mapStateToProps = (
    state: IServiceDevelopmentState,
  ) => {
    return {
      repoStatus: GetRepoStatusSelector(state),
      language: state.language,
    };
  };
  return mapStateToProps;
};

export default withStyles(styles)(connect(makeMapStateToProps)(HandleMergeConflictContainer));
