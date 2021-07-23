/* eslint-disable no-nested-ternary */
/* eslint-disable import/no-named-as-default */
import { Hidden, Typography } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import { createTheme, createStyles, MuiThemeProvider, withStyles, WithStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import { connect } from 'react-redux';
import FileEditor from 'app-shared/file-editor/FileEditor';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import { getLanguageFromKey } from 'app-shared/utils/language';
import VersionControlHeader from 'app-shared/version-control/versionControlHeader';
import { makeGetRepoStatusSelector } from './handleMergeConflictSelectors';
import HandleMergeConflictAbort from './components/HandleMergeConflictAbort';
import HandleMergeConflictDiscardChanges from './components/HandleMergeConflictDiscardChanges';
import HandleMergeConflictFileList from './components/HandleMergeConflictFileList';

const theme = createTheme(altinnTheme);

const styles = () => createStyles({
  root: {
    minHeight: '100%',
    paddingTop: 10,
    paddingRight: 60,
    paddingBottom: 10,
    paddingLeft: 60,
  },
  box: {
    background: theme.altinnPalette.primary.white,
    padding: 1,
  },
  boxTop: {
    [theme.breakpoints.down('sm')]: {
      height: `calc(100vh - 50px - 120px - 200px)`,
    },
    [theme.breakpoints.up('md')]: {
      height: `calc(100vh - 50px - 120px - 200px)`,
    },
  },
  boxBottom: {
    height: 60,
  },
  containerMessage: {
    padding: '10px',
  },
  containerMessageHasConflict: {
    maxWidth: '1100px',
  },
  containerMessageNoConflict: {
    background: theme.altinnPalette.primary.greenLight,
    boxShadow: theme.sharedStyles.boxShadow,
  },
});

export interface IHandleMergeConflictContainerProps extends WithStyles<typeof styles> {
  language: any;
  name?: any;
  repoStatus: any;
}

export interface IHandleMergeConflictContainerState {
  editorHeight: string;
  selectedFile: string;
}

export class HandleMergeConflictContainer extends
  React.Component<IHandleMergeConflictContainerProps, IHandleMergeConflictContainerState> {
  constructor(_props: IHandleMergeConflictContainerProps, _state: IHandleMergeConflictContainerState) {
    super(_props, _state);
    this.setEditorHeight = this.setEditorHeight.bind(this);
    this.state = {
      editorHeight: null,
      selectedFile: '>',
    };
  }

  public componentDidMount() {
    this.setEditorHeight();
    window.addEventListener('resize', this.setEditorHeight);
  }

  public componentWillUnmount() {
    window.removeEventListener('resize', this.setEditorHeight);
  }

  public changeSelectedFile = (file: string) => {
    this.setState({
      selectedFile: file,
    });
  }

  public setEditorHeight = () => {
    const height = document.getElementById('mergeConflictFileList').clientHeight;
    const editorHeight = height - 47 - 48;
    this.setState({
      editorHeight: editorHeight.toString(),
    });
  }

  public render() {
    const {
      classes,
      language,
      repoStatus,
    } = this.props;
    const { selectedFile } = this.state;

    return (
      <React.Fragment>
        <MuiThemeProvider theme={theme}>
          <div className={classes.root} id='handleMergeConflictContainer'>

            <Grid
              container={true}
              justify='flex-start'
              alignItems='stretch'
            >
              <Grid
                item={true}
                xs={12}
              >
                {repoStatus.hasMergeConflict ? null : <VersionControlHeader language={language} />}

                <Hidden smDown={true}>
                  <Typography variant='h1'>
                    {getLanguageFromKey('handle_merge_conflict.container_title', language)}
                  </Typography>
                </Hidden>

                {
                  repoStatus.hasMergeConflict ?
                    <div className={classNames(classes.containerMessage, classes.containerMessageHasConflict)}>
                      {getLanguageFromKey('handle_merge_conflict.container_message_has_conflict', language)}
                    </div>
                    :
                    repoStatus.contentStatus ?
                      repoStatus.contentStatus.length > 0 ?
                        <Grid
                          item={true}
                          xs={12}
                          container={true}
                          justify='center'
                          alignItems='center'
                          className={classes.containerMessage}
                        >
                          <Grid item={true}>
                            <div className={classNames(classes.containerMessage, classes.containerMessageNoConflict)}>
                              {getLanguageFromKey('handle_merge_conflict.container_message_no_conflict', language)}
                            </div>
                          </Grid>
                        </Grid>
                        :
                        <div className={classNames(classes.containerMessage)}>
                          {getLanguageFromKey('handle_merge_conflict.container_message_no_files', language)}
                        </div>
                      :
                      null

                }
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

                  <HandleMergeConflictFileList
                    repoStatus={repoStatus}
                    language={language}
                    changeSelectedFile={this.changeSelectedFile}
                  />

                </Grid>

                <Grid
                  id='monacoEditor'
                  item={true}
                  xs={8}
                  className={classNames(classes.box)}
                >
                  <FileEditor
                    boxShadow={true}
                    checkRepoStatusAfterSaveFile={true}
                    editorHeight={this.state.editorHeight}
                    loadFile={selectedFile}
                    mode='Root'
                    showSaveButton={true}
                    stageAfterSaveFile={true}
                  />
                </Grid>

              </Grid>

              {/* Bottom grid */}
              <Grid
                container={true}
                item={true}
                xs={12}
                alignItems='center'
                justify='flex-start'
                className={classes.boxBottom}
              >

                <Grid item={true}>
                  <HandleMergeConflictDiscardChanges
                    language={language}
                    disabled={!repoStatus.hasMergeConflict}
                  />
                </Grid>
                <Grid item={true}>
                  <HandleMergeConflictAbort
                    language={this.props.language}
                    disabled={!repoStatus.hasMergeConflict}
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
      language: state.languageState.language,
    };
  };
  return mapStateToProps;
};

export default withStyles(styles)(connect(makeMapStateToProps)(HandleMergeConflictContainer));
