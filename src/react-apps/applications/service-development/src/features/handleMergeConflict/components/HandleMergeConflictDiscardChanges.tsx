import { createMuiTheme, createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import * as React from 'react';
import AltinnButton from '../../../../../shared/src/components/AltinnButton';
import AltinnPopover from '../../../../../shared/src/components/AltinnPopover';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import { get } from '../../../../../shared/src/utils/networking';
const theme = createMuiTheme(altinnTheme);
import postMessages from '../../../../../shared/src/utils/postMessages';

const styles = () => createStyles({
  textDisabled: {
    color: theme.altinnPalette.primary.grey,
  },
  input: {
    marginRight: 49,
  },
});

export interface IHandleMergeConflictDiscardChangesProps extends WithStyles<typeof styles> {
  disabled?: boolean;
  language: any;
}

export interface IHandleMergeConflictDiscardChangesState {
  anchorEl: any;
  errorObj: any;
  networkingRes: any;
  popoverState: any;
}

const initialPopoverState = {
  descriptionText: '',
  isLoading: false,
  shouldShowDoneIcon: false,
  btnConfirmText: 'OK',
  shouldShowCommitBox: false,
  btnMethod: '',
  btnCancelText: '',
};

export class HandleMergeConflictDiscardChanges extends
  React.Component<IHandleMergeConflictDiscardChangesProps, IHandleMergeConflictDiscardChangesState> {

  constructor(_props: IHandleMergeConflictDiscardChangesProps) {
    super(_props);
    this.state = {
      anchorEl: null,
      errorObj: null,
      networkingRes: null,
      popoverState: initialPopoverState,
    };
  }

  public discardChangesPopover = (event: any) => {
    this.setState({
      anchorEl: event.currentTarget,
      popoverState: { // TODO: Immutability-helper
        ...this.state.popoverState,
        btnMethod: this.discardChangesConfirmed,
        btnConfirmText: getLanguageFromKey('handle_merge_conflict.discard_changes_button_confirm',
          this.props.language),
        descriptionText: getLanguageFromKey('handle_merge_conflict.discard_changes_message',
          this.props.language),
        btnCancelText: getLanguageFromKey('handle_merge_conflict.discard_changes_button_cancel',
          this.props.language),
      },
    });
  }

  // TODO: Add a spinner
  public discardChangesConfirmed = async () => {
    const altinnWindow: any = window as any;
    const { org, service } = altinnWindow;

    try {

      this.setState({
        popoverState: {
          ...this.state.popoverState,
          isLoading: true,
          btnText: null,
          btnCancelText: null,
        },
      });

      const discardUrl = `${altinnWindow.location.origin}/` +
        `designerapi/Repository/DiscardLocalChanges?owner=${org}&repository=${service}`;
      const discardRes = await get(discardUrl);

      if (discardRes.isSuccessStatusCode === true) {
        this.setState({
          networkingRes: discardRes,
          popoverState: {
            ...this.state.popoverState,
            isLoading: false,
            shouldShowDoneIcon: true,
          },
        });

        window.postMessage(postMessages.forceRepoStatusCheck, window.location.href);

      } else {
        this.setState({
          networkingRes: discardRes,
          popoverState: {
            ...this.state.popoverState,
            isLoading: false,
            shouldShowDoneIcon: false,
          },
        });

        console.error('Discard merge error', discardRes);

      }

    } catch (err) {
      this.setState({
        errorObj: err,
        networkingRes: 'error',
        popoverState: {
          ...this.state.popoverState,
          isLoading: false,
        },
      });

      console.error('Discard merge error', err);

    }

  }

  public handleClose = () => {
    this.setState({
      anchorEl: null,
    });
  }

  public render() {
    const { popoverState } = this.state;
    return (
      <React.Fragment>

        <AltinnButton
          id='discardMergeChangesBtn'
          btnText={getLanguageFromKey('handle_merge_conflict.discard_changes_button', this.props.language)}
          onClickFunction={this.discardChangesPopover}
          secondaryButton={true}
          disabled={this.props.disabled}
        />

        <AltinnPopover
          anchorEl={this.state.anchorEl}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          btnCancelText={popoverState.btnCancelText}
          btnClick={popoverState.btnMethod}
          btnConfirmText={popoverState.btnConfirmText}
          btnPrimaryId='discardMergeChangesConfirmBtn'
          descriptionText={popoverState.descriptionText}
          handleClose={this.handleClose}
          header={popoverState.header}
          isLoading={popoverState.isLoading}
          shouldShowCommitBox={popoverState.shouldShowCommitBox}
          shouldShowDoneIcon={popoverState.shouldShowDoneIcon}
          transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        />

      </React.Fragment >
    );
  }
}

export default withStyles(styles)(HandleMergeConflictDiscardChanges);
