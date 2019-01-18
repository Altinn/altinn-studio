import { Typography } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import { createMuiTheme, createStyles, MuiThemeProvider, withStyles, WithStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import { connect } from 'react-redux';
import AltinnIcon from '../../../../shared/src/components/AltinnIcon';
import altinnTheme from '../../../../shared/src/theme/altinnStudioTheme';
import { get } from '../../../../shared/src/utils/networking';
import { makeGetRepoStatusSelector } from '../handleMergeConflict/handleMergeConflictSelectors';
import HandleMergeConflictFileList from './components/HandleMergeConflictFileList';
import HandleMergeConflictValidateChanges from './components/HandleMergeConflictValidateChanges';

import FileEditor from '../../../../shared/src/file-editor/FileEditor';

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
  box: {
    padding: 1,
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
    // marginTop: 20,
    // backgroundColor: '#cccccc',
  },
  fileWithMergeConflict: {
    '&:hover': {
      color: '#0062BA',
      textDecoration: 'underline',
    },
  },
  title: {
    marginBottom: 16,
  },
});

export interface IHandleMergeConflictContainerProps extends WithStyles<typeof styles> {
  language: any;
  name?: any;
  repoStatus: any;
}

export interface IHandleMergeConflictContainerState {
  selectedFile: string;
}

class HandleMergeConflictContainer extends
  React.Component<IHandleMergeConflictContainerProps, IHandleMergeConflictContainerState> {

  constructor(_props: IHandleMergeConflictContainerProps, _state: IHandleMergeConflictContainerState) {
    super(_props, _state);
    this.state = {
      selectedFile: null,
    };
  }

  public changeSelectedFile = (file: string) => {
    this.setState({
      selectedFile: file,
    });
  }

  public Abort() {
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
    const { selectedFile } = this.state;

    return (
      <React.Fragment>
        <MuiThemeProvider theme={theme}>
          <div className={classes.root} id='handleMergeConflictContainer'>

            <Grid
              container={true}
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
                id='boxtop'
                container={true}
                item={true}
                xs={12}
                direction='row'
                className={classes.boxTop}

              >
                <Grid
                  id='mergeConflictFileList'
                  item={true}
                  xs={4}
                  className={classNames(classes.box)}
                >

                  {repoStatus.contentStatus ?
                    <HandleMergeConflictFileList
                      repoStatus={repoStatus}
                      language={language}
                      changeSelectedFile={this.changeSelectedFile}
                    />
                    :
                    null
                  }

                </Grid>

                <Grid
                  id='monacoEditor'
                  item={true}
                  xs={8}
                  className={classNames(classes.box)}
                >
                  <FileEditor
                    loadFile={selectedFile}
                    boxShadow={true}
                    showSaveButton={true}
                    checkRepoStatusAfterSaveFile={true}
                  />
                </Grid>

              </Grid>
              {/* Bottom grid */}
              <Grid
                container={true}
                item={true}
                xs={12}
                alignItems='center'
                justify='flex-end'
                className={classes.boxBottom}
              >

                <Grid item={true}>
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
