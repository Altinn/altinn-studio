
import * as React from 'react';
import AltinnButton from '../../../../../shared/src/components/AltinnButton';
import AltinnPopover from '../../../../../shared/src/components/AltinnPopover';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import { get } from '../../../../../shared/src/utils/networking';

export interface IHandleMergeConflictAbortProps {
  language: any;
}

export interface IHandleMergeConflictAbortState {
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

class HandleMergeConflictAbort extends
  React.Component<IHandleMergeConflictAbortProps, IHandleMergeConflictAbortState> {

  constructor(_props: IHandleMergeConflictAbortProps) {
    super(_props);
    this.state = {
      anchorEl: null,
      popoverState: initialPopoverState,
    };
  }

  public AbortPopover = (event: any) => {
    this.setState({
      anchorEl: event.currentTarget,
      popoverState: { // TODO: Immutability-helper
        ...this.state.popoverState,
        btnMethod: this.AbortConfirmed,
        btnText: getLanguageFromKey('handle_merge_conflict.confirm_abort_merge_button_confirm',
          this.props.language),
        descriptionText: getLanguageFromKey('handle_merge_conflict.confirm_abort_merge_message',
          this.props.language),
        btnCancelText: getLanguageFromKey('handle_merge_conflict.confirm_abort_merge_button_cancel',
          this.props.language),
      },
    });
  }

  public AbortConfirmed() {
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
    const { popoverState } = this.state;

    return (
      <React.Fragment>
        <AltinnButton
          btnText={getLanguageFromKey('handle_merge_conflict.abort_merge_button', this.props.language)}
          onClickFunction={this.AbortPopover}
          secondaryButton={true}
        />

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

export default HandleMergeConflictAbort;
