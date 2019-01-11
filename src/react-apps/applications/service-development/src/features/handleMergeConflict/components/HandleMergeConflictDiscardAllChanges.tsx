import { createMuiTheme, createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import * as React from 'react';
import AltinnIcon from '../../../../../shared/src/components/AltinnIcon';
import AltinnPopover from '../../../../../shared/src/components/AltinnPopover';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import { get } from '../../../../../shared/src/utils/networking';
const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  altinnIcon: {
    'textDecoration': 'none',
    '&:hover': {
      textDecoration: 'none',
    },
  },
  discarChangesArea: {
    cursor: 'pointer',
  },
  text: {
    'color': theme.altinnPalette.primary.blueDarker,
    'textDecoration': 'underline',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
});

export interface IHandleMergeConflictDiscardAllChangesProps extends WithStyles<typeof styles> {
  language: any;
}

export interface IHandleMergeConflictDiscardAllChangesState {
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

class HandleMergeConflictDiscardAllChanges extends
  React.Component<IHandleMergeConflictDiscardAllChangesProps, IHandleMergeConflictDiscardAllChangesState> {

  constructor(_props: IHandleMergeConflictDiscardAllChangesProps) {
    super(_props);
    this.state = {
      anchorEl: null,
      popoverState: initialPopoverState,
    };
  }

  public discardAllChangesPopover = (event: any) => {
    this.setState({
      anchorEl: event.currentTarget,
      popoverState: { // TODO: Immutability-helper
        ...this.state.popoverState,
        btnMethod: this.discardAllChangesConfirmed,
        btnText: getLanguageFromKey('handle_merge_conflict.confirm_discard_local_changes_button_confirm',
          this.props.language),
        descriptionText: getLanguageFromKey('handle_merge_conflict.confirm_discard_local_changes_message',
          this.props.language),
        btnCancelText: getLanguageFromKey('handle_merge_conflict.confirm_discard_local_changes_button_cancel',
          this.props.language),
      },
    });
  }

  public discardAllChangesConfirmed() {
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

  public render() {
    const { classes } = this.props;
    const { popoverState } = this.state;

    return (
      <React.Fragment>
        <span
          className={classes.discarChangesArea}
        >
          <AltinnIcon
            isActive={false}
            iconClass='ai ai-undo'
            iconColor={theme.altinnPalette.primary.blueDarker}
            iconSize={20}
          />
          <span
            className={classes.text}
            onClick={this.discardAllChangesPopover}
          >
            {getLanguageFromKey('handle_merge_conflict.discard_all_local_changes', this.props.language)}
          </span>
        </span>

        <AltinnPopover
          anchorEl={this.state.anchorEl}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          btnCancelText={popoverState.btnCancelText}
          btnClick={popoverState.btnMethod}
          btnConfirmText={popoverState.btnText}
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

export default withStyles(styles)(HandleMergeConflictDiscardAllChanges);
