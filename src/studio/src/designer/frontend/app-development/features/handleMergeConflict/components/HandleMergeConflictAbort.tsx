/* eslint-disable react/no-access-state-in-setstate */
/* eslint-disable react/no-unused-state */
import * as React from 'react';
import AltinnButton from 'app-shared/components/AltinnButton';
import AltinnPopover from 'app-shared/components/AltinnPopover';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { get } from 'app-shared/utils/networking';
import postMessages from 'app-shared/utils/postMessages';

export interface IHandleMergeConflictAbortProps {
  language: any;
  disabled?: boolean;
}

export interface IHandleMergeConflictAbortState {
  anchorEl: any;
  errorObj: null;
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

export class HandleMergeConflictAbort extends
  React.Component<IHandleMergeConflictAbortProps, IHandleMergeConflictAbortState> {
  constructor(_props: IHandleMergeConflictAbortProps) {
    super(_props);
    this.state = {
      anchorEl: null,
      errorObj: null,
      networkingRes: null,
      popoverState: initialPopoverState,
    };
  }

  public AbortPopover = (event: any) => {
    this.setState({
      anchorEl: event.currentTarget,
      popoverState: {
        ...this.state.popoverState,
        btnMethod: this.AbortConfirmed,
        btnConfirmText: getLanguageFromKey('handle_merge_conflict.abort_merge_button_confirm',
          this.props.language),
        descriptionText: getLanguageFromKey('handle_merge_conflict.abort_merge_message',
          this.props.language),
        btnCancelText: getLanguageFromKey('handle_merge_conflict.abort_merge_button_cancel',
          this.props.language),
      },
    });
  }

  public AbortConfirmed = async () => {
    const { org, repo } = window as Window as IAltinnWindow;

    const abortUrl = `${window.location.origin}` +
      `/designerapi/Repository/AbortMerge?org=${org}&repository=${repo}`;

    // Try to abort merge and catch error
    // If successfull merge abort then initiate forceRepoStatusCheck
    try {
      this.setState({
        popoverState: {
          ...this.state.popoverState,
          isLoading: true,
          btnConfirmText: null,
          btnCancelText: null,
        },
      });

      const abortRes = await get(abortUrl);
      if (abortRes.isSuccessStatusCode === true) {
        this.setState({
          networkingRes: abortRes,
          popoverState: {
            ...this.state.popoverState,
            isLoading: false,
            shouldShowDoneIcon: true,
          },
        });

        window.postMessage(postMessages.forceRepoStatusCheck, window.location.href);
        this.handleClose();
      } else {
        this.setState({
          networkingRes: abortRes,
          popoverState: {
            ...this.state.popoverState,
            isLoading: false,
            btnConfirmText: null,
            btnCancelText: null,
          },
        });
        console.error('Abort is unsuccessfull', abortRes);
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
      console.error('Merge abort error', err);
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
          btnText={getLanguageFromKey('handle_merge_conflict.abort_merge_button', this.props.language)}
          id='abortMergeBtn'
          onClickFunction={this.AbortPopover}
          secondaryButton={true}
          disabled={this.props.disabled}
        />

        <AltinnPopover
          anchorEl={this.state.anchorEl}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          btnCancelText={popoverState.btnCancelText}
          btnClick={popoverState.btnMethod}
          btnConfirmText={popoverState.btnConfirmText}
          btnPrimaryId='abortMergeConfirmBtn'
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
