import { createMuiTheme, createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import * as React from 'react';
import AltinnButton from '../../../../../shared/src/components/AltinnButton';
import AltinnPopover from '../../../../../shared/src/components/AltinnPopover';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import { get } from '../../../../../shared/src/utils/networking';
const theme = createMuiTheme(altinnTheme);

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

export class HandleMergeConflictDiscardChanges extends
  React.Component<IHandleMergeConflictDiscardChangesProps, IHandleMergeConflictDiscardChangesState> {

  constructor(_props: IHandleMergeConflictDiscardChangesProps) {
    super(_props);
    this.state = {
      anchorEl: null,
      popoverState: initialPopoverState,
    };
  }

  public discardChangesPopover = (event: any) => {
    this.setState({
      anchorEl: event.currentTarget,
      popoverState: { // TODO: Immutability-helper
        ...this.state.popoverState,
        btnMethod: this.discardChangesConfirmed,
        btnText: getLanguageFromKey('handle_merge_conflict.discard_changes_button_confirm',
          this.props.language),
        descriptionText: getLanguageFromKey('handle_merge_conflict.discard_changes_message',
          this.props.language),
        btnCancelText: getLanguageFromKey('handle_merge_conflict.discard_changes_button_cancel',
          this.props.language),
      },
    });
  }

  // TODO: Add a spinner
  public discardChangesConfirmed() {
    const altinnWindow: any = window as any;
    const { org, service } = altinnWindow;
    // tslint:disable-next-line:max-line-length
    const url = `${altinnWindow.location.origin}/designerapi/Repository/DiscardLocalChanges?owner=${org}&repository=${service}`;
    get(url).then((result: any) => {
      console.log('result', result);
      this.handleClose();
    });
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
          btnConfirmText={popoverState.btnText}
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
