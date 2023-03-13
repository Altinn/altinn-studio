import React from 'react';
import { Grid, Typography } from '@mui/material';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { VersionControlHeader } from 'app-shared/version-control/VersionControlHeader';
import { makeGetRepoStatusSelector } from './handleMergeConflictSelectors';
import HandleMergeConflictAbortComponent from './components/HandleMergeConflictAbort';
import HandleMergeConflictDiscardChangesComponent from './components/HandleMergeConflictDiscardChanges';
import HandleMergeConflictFileListComponent from './components/HandleMergeConflictFileList';
import type { RootState } from '../../store';
import classes from './HandleMergeConflictContainer.module.css';
import { withTranslation } from 'react-i18next';
import i18next from 'i18next';

interface IHandleMergeConflictContainerProps {
  name?: any;
  repoStatus: any;
  t: typeof i18next.t;
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
    const { t, repoStatus } = this.props;

    return (
      <div className={classes.root} id='handleMergeConflictContainer'>
        <Grid container={true} justifyContent='flex-start' alignItems='stretch'>
          <Grid item={true} xs={12}>
            {repoStatus.hasMergeConflict ? null : <VersionControlHeader />}

            <Typography variant='h1'>{t('handle_merge_conflict.container_title')}</Typography>

            {repoStatus.hasMergeConflict ? (
              <div
                className={classNames(
                  classes.containerMessage,
                  classes.containerMessageHasConflict
                )}
              >
                {t('handle_merge_conflict.container_message_has_conflict')}
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
                      {t('handle_merge_conflict.container_message_no_conflict')}
                    </div>
                  </Grid>
                </Grid>
              ) : (
                <div className={classes.containerMessage}>
                  {t('handle_merge_conflict.container_message_no_files')}
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
            <Grid id='mergeConflictFileList' item={true} xs={4} className={classes.box}>
              <HandleMergeConflictFileListComponent
                repoStatus={repoStatus}
                changeSelectedFile={this.changeSelectedFile}
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
              <HandleMergeConflictDiscardChangesComponent disabled={!repoStatus.hasMergeConflict} />
            </Grid>
            <Grid item={true}>
              <HandleMergeConflictAbortComponent disabled={!repoStatus.hasMergeConflict} />
            </Grid>
          </Grid>
        </Grid>
      </div>
    );
  }
}

const makeMapStateToProps = () => {
  const GetRepoStatusSelector = makeGetRepoStatusSelector();
  return (state: RootState) => {
    return {
      repoStatus: GetRepoStatusSelector(state),
    };
  };
};

export default withTranslation()(connect(makeMapStateToProps)(HandleMergeConflictContainer));
