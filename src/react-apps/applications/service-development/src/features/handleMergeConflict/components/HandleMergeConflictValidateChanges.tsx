import { Grid } from '@material-ui/core';
import { createMuiTheme, createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import * as React from 'react';
import AltinnButton from '../../../../../shared/src/components/AltinnButton';
import AltinnInput from '../../../../../shared/src/components/AltinnInput';
import AltinnPopover from '../../../../../shared/src/components/AltinnPopover';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import { get, post } from '../../../../../shared/src/utils/networking';
import HandleMergeConflictAbort from './HandleMergeConflictAbort';
// import { makeGetApiConnectionsSelector } from '../../../../../ux-editor/src/selectors/getServiceConfigurations';

import * as classNames from 'classnames';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';
const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  textDisabled: {
    color: theme.altinnPalette.primary.grey,
  },
  input: {
    marginRight: 49,
  },
});

export interface IHandleMergeConflictValidateChangesProps extends WithStyles<typeof styles> {
  language: any;
  repoStatus: any;
}

export interface IHandleMergeConflictValidateChangesState {
  anchorEl: any;
  form: {
    commitMessageInput: string;
  };
  popoverState: any;
}

const initialPopoverState = {
  descriptionText: '',
  isLoading: false,
  shouldShowDoneIcon: false,
  btnText: 'OK',
  shouldShowCommitBox: false,
  btnMethod: '',
  btnCancelText: '',
};

class HandleMergeConflictValidateChanges extends
  React.Component<IHandleMergeConflictValidateChangesProps, IHandleMergeConflictValidateChangesState> {

  constructor(_props: IHandleMergeConflictValidateChangesProps) {
    super(_props);
    this.state = {
      anchorEl: null,
      popoverState: initialPopoverState,
      form: {
        commitMessageInput: '',
      },
    };
  }

  public validateChanges = async (event: any) => {
    this.setState({
      anchorEl: event.currentTarget,
      popoverState: {
        header: getLanguageFromKey('sync_header.fetching_latest_version', this.props.language),
        isLoading: true,
      },
    });
    const { commitMessageInput } = this.state.form;

    const altinnWindow: any = window as any;
    const { org, service } = altinnWindow;

    const options = {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    };

    const commitBody = JSON.stringify({ message: commitMessageInput, org, repository: service });
    const commitUrl = `${altinnWindow.location.origin}/designerapi/Repository/Commit`;
    const commitResult = await post(commitUrl, commitBody, options);
    console.log('commitResult', commitResult);

    const pullUrl = `${altinnWindow.location.origin}/designerapi/Repository/Pull?owner=${org}&repository=${service}`;
    const pullResult = await get(pullUrl);
    console.log('pullResult', pullResult);

    if (pullResult.hasMergeConflict === false) {
      window.postMessage('forceRepoStatusCheck', window.location.href);
      this.setState({
        popoverState: {
          descriptionText:
            getLanguageFromKey('handle_merge_conflict.validate_ok_message', this.props.language),
          btnText:
            getLanguageFromKey('handle_merge_conflict.validate_confirm_share_changes', this.props.language),
          btnCancelText:
            getLanguageFromKey('handle_merge_conflict.validate_continue_working_dont_share', this.props.language),
          btnMethod: this.pushChanges,
        },
      });

    } else if (pullResult.hasMergeConflict === true) {

      this.setState({
        // todo text
        popoverState: {
          header: 'merge konflikt',
          descriptionText:
            'du har merge conflikt',
          btnText: 'OK',
          shouldShowCommitBox: true,
          btnMethod: this.handleClose,
        },
      });

    }
  }

  public pushChanges = () => {
    this.setState({
      popoverState: {
        header: getLanguageFromKey('sync_header.sharing_changes', this.props.language),
        isLoading: true,
      },
    });

    const altinnWindow: any = window as any;
    const { org, service } = altinnWindow;
    const url = `${altinnWindow.location.origin}/designerapi/Repository/Push?owner=${org}&repository=${service}`;

    post(url).then((result: any) => {
      this.setState({
        popoverState: {
          header: getLanguageFromKey('sync_header.sharing_changes_completed', this.props.language),
          descriptionText:
            getLanguageFromKey('sync_header.sharing_changes_completed_submessage', this.props.language),
          shouldShowDoneIcon: true,
        },
      });
    });
  }


  // TODO: DISCARD ALL LOCAL CHANGES
  public ValidateChangesConfirmed() {
    const altinnWindow: any = window as any;
    const { org, service } = altinnWindow;
    // tslint:disable-next-line:max-line-length
    const url = `${altinnWindow.location.origin}/designerapi/Repository/DiscardLocalChanges?owner=${org}&repository=${service}`;
    get(url).then((result: any) => {
      console.log('result', result);
    });
  }

  public handleClose = () => {
    this.setState({
      anchorEl: null,
    });
  }

  public handleFormChange = (event: any) => {
    console.log('target.id', event.target.value);
    const target = event.target;
    // Use target.type checkbox if checkbox is used.
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const id = target.id;

    this.setState({
      form: {
        ...this.state.form,
        [id]: value,
      },
    });
  }

  public render() {
    const { classes, repoStatus } = this.props;
    const { popoverState } = this.state;
    return (
      <React.Fragment>
        <Grid
          container={true}
          alignItems='flex-end'
          justify='flex-end'
        >
          <Grid
            item={true}
            className={classes.input}
          >
            <span
              className={classNames({
                [classes.textDisabled]: repoStatus.hasMergeConflict,
              })}
            >
              {getLanguageFromKey('handle_merge_conflict.commit_message_label', this.props.language)}
            </span>

            <AltinnInput
              id='commitMessageInput'
              onChangeFunction={this.handleFormChange}
              fullWidth={true}
              disabled={repoStatus.hasMergeConflict}
            />
          </Grid>
          <Grid
            item={true}
          >
            <AltinnButton
              btnText={getLanguageFromKey('general.validate_changes', this.props.language)}
              onClickFunction={this.validateChanges}
            // TODO: disabled={repoStatus.hasMergeConflict || repoStatus.contentStatus.length > 0}
            // disabled={repoStatus.hasMergeConflict}
            />
            <HandleMergeConflictAbort
              language={this.props.language}
            />
          </Grid>

        </Grid>

        <AltinnPopover
          anchorEl={this.state.anchorEl}
          anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
          btnCancelText={popoverState.btnCancelText}
          btnClick={popoverState.btnMethod}
          btnConfirmText={popoverState.btnText}
          descriptionText={popoverState.descriptionText}
          handleClose={this.handleClose}
          header={popoverState.header}
          isLoading={popoverState.isLoading}
          shouldShowCommitBox={popoverState.shouldShowCommitBox}
          shouldShowDoneIcon={popoverState.shouldShowDoneIcon}
          transformOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        />

      </React.Fragment >
    );
  }
}

export default withStyles(styles)(HandleMergeConflictValidateChanges);
