import { Hidden, Typography } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import { createMuiTheme, createStyles, MuiThemeProvider, withStyles, WithStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import { connect } from 'react-redux';
import FileEditor from '../../../../shared/src/file-editor/FileEditor';
import altinnTheme from '../../../../shared/src/theme/altinnStudioTheme';
import { getLanguageFromKey } from '../../../../shared/src/utils/language';
import VersionControlHeader from '../../../../shared/src/version-control/versionControlHeader';
import { makeGetRepoStatusSelector } from '../handleMergeConflict/handleMergeConflictSelectors';
import HandleMergeConflictAbort from './components/HandleMergeConflictAbort';
import HandleMergeConflictDiscardChanges from './components/HandleMergeConflictDiscardChanges';
import HandleMergeConflictFileList from './components/HandleMergeConflictFileList';

const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  root: {
    minHeight: '100%',
    paddingTop: 10,
    paddingRight: 60,
    paddingBottom: 10,
    paddingLeft: 60,
  },
  box: {
    padding: 1,
  },
  boxTop: {
    [theme.breakpoints.down('sm')]: {
      height: `calc(100vh - 110px - 120px - 200px - 36px)`, // TODO: remove 36 when old top menu is removed
    },
    [theme.breakpoints.up('md')]: {
      height: `calc(100vh - 110px - 120px - 200px - 36px)`, // TODO: remove 36 when old top menu is removed
    },
  },
  boxBottom: {
    height: 130,
  },
  containerMessage: {
    marginBottom: '12px',
    maxWidth: '1000px',
    padding: '10px',
  },
  containerMessageHasConflict: {
    background: theme.altinnPalette.primary.redLight,
    boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)',
  },
  containerMessageNoConflict: {
    background: theme.altinnPalette.primary.greenLight,
    boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)',
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

export class HandleMergeConflictContainer extends
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
              alignItems='stretch'
            >
              <Grid
                item={true}
                xs={12}
                className={classes.title}
              >
                <VersionControlHeader language={language} />

                <Hidden smDown={true}>
                  <Typography variant='h1'>
                    {getLanguageFromKey('handle_merge_conflict.container_title', language)}
                  </Typography>
                </Hidden>

              </Grid>

              {repoStatus.hasMergeConflict ?

                <span className={classNames(classes.containerMessage)}>
                  {getLanguageFromKey('handle_merge_conflict.container_message_has_conflict', language)}
                </span>

                :

                repoStatus.contentStatus.length > 0 ?

                  <span className={classNames(classes.containerMessage, classes.containerMessageNoConflict)}>
                    {getLanguageFromKey('handle_merge_conflict.container_message_no_conflict', language)}
                  </span>

                  :

                  <span className={classNames(classes.containerMessage)}>
                    {getLanguageFromKey('handle_merge_conflict.container_message_no_files', language)}
                  </span>

              }

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
      language: state.language,
    };
  };
  return mapStateToProps;
};

export default withStyles(styles)(connect(makeMapStateToProps)(HandleMergeConflictContainer));
