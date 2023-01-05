import React from 'react';
import { Grid, Typography } from '@mui/material';
import classNames from 'classnames';
import { connect } from 'react-redux';
import FileEditor from 'app-shared/file-editor/FileEditor';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { VersionControlHeader } from 'app-shared/version-control/VersionControlHeader';
import { makeGetRepoStatusSelector } from './handleMergeConflictSelectors';
import HandleMergeConflictAbortComponent from './components/HandleMergeConflictAbort';
import HandleMergeConflictDiscardChangesComponent from './components/HandleMergeConflictDiscardChanges';
import HandleMergeConflictFileListComponent from './components/HandleMergeConflictFileList';
import type { RootState } from '../../store';
import classes from './HandleMergeConflictContainer.module.css';

interface IHandleMergeConflictContainerProps {
  language: any;
  name?: any;
  repoStatus: any;
}

interface IHandleMergeConflictContainerState {
  editorHeight: string;
  selectedFile: string;
}

export class HandleMergeConflictContainer extends React.Component<
  IHandleMergeConflictContainerProps,
  IHandleMergeConflictContainerState
> {
  constructor(props: IHandleMergeConflictContainerProps) {
    super(props);
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
  };

  public setEditorHeight = () => {
    const height = document.getElementById('mergeConflictFileList').clientHeight;
    const editorHeight = height - 47 - 48;
    this.setState({
      editorHeight: editorHeight.toString(),
    });
  };

  public render() {
    const { language, repoStatus } = this.props;
    const { selectedFile } = this.state;

    return (
      <React.Fragment>
        <div className={classes.root} id='handleMergeConflictContainer'>
          <Grid container={true} justifyContent='flex-start' alignItems='stretch'>
            <Grid item={true} xs={12}>
              {repoStatus.hasMergeConflict ? null : <VersionControlHeader language={language} />}

              <Typography variant='h1'>
                {getLanguageFromKey('handle_merge_conflict.container_title', language)}
              </Typography>

              {repoStatus.hasMergeConflict ? (
                <div
                  className={classNames(
                    classes.containerMessage,
                    classes.containerMessageHasConflict
                  )}
                >
                  {getLanguageFromKey(
                    'handle_merge_conflict.container_message_has_conflict',
                    language
                  )}
                </div>
              ) : repoStatus.contentStatus ? (
                repoStatus.contentStatus.length > 0 ? (
                  <Grid
                    item={true}
                    xs={12}
                    container={true}
                    justifyContent='center'
                    alignItems='center'
                    className={classes.containerMessage}
                  >
                    <Grid item={true}>
                      <div
                        className={classNames(
                          classes.containerMessage,
                          classes.containerMessageNoConflict
                        )}
                      >
                        {getLanguageFromKey(
                          'handle_merge_conflict.container_message_no_conflict',
                          language
                        )}
                      </div>
                    </Grid>
                  </Grid>
                ) : (
                  <div className={classes.containerMessage}>
                    {getLanguageFromKey(
                      'handle_merge_conflict.container_message_no_files',
                      language
                    )}
                  </div>
                )
              ) : null}
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
                className={classes.box}
              >
                <HandleMergeConflictFileListComponent
                  repoStatus={repoStatus}
                  language={language}
                  changeSelectedFile={this.changeSelectedFile}
                />
              </Grid>

              <Grid id='monacoEditor' item={true} xs={8} className={classes.box}>
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

            <Grid
              container={true}
              item={true}
              xs={12}
              alignItems='center'
              justifyContent='flex-start'
              className={classes.boxBottom}
            >
              <Grid item={true}>
                <HandleMergeConflictDiscardChangesComponent
                  language={language}
                  disabled={!repoStatus.hasMergeConflict}
                />
              </Grid>
              <Grid item={true}>
                <HandleMergeConflictAbortComponent
                  language={this.props.language}
                  disabled={!repoStatus.hasMergeConflict}
                />
              </Grid>
            </Grid>
          </Grid>
        </div>
      </React.Fragment>
    );
  }
}

const makeMapStateToProps = () => {
  const GetRepoStatusSelector = makeGetRepoStatusSelector();
  return (state: RootState) => {
    return {
      repoStatus: GetRepoStatusSelector(state),
      language: state.languageState.language,
    };
  };
};

export default connect(makeMapStateToProps)(HandleMergeConflictContainer);
