import React from 'react';
import AltinnButton from 'app-shared/components/AltinnButton';
import AltinnPopover from 'app-shared/components/AltinnPopover';
import { get } from 'app-shared/utils/networking';
import postMessages from 'app-shared/utils/postMessages';
import { _useParamsClassCompHack } from 'app-shared/utils/_useParamsClassCompHack';
import { abortmergePath } from 'app-shared/api-paths';
import i18next from 'i18next';
import { withTranslation } from 'react-i18next';

interface IHandleMergeConflictAbortProps {
  disabled?: boolean;
  t: typeof i18next.t;
}

interface IHandleMergeConflictAbortState {
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

export class HandleMergeConflictAbort extends React.Component<
  IHandleMergeConflictAbortProps,
  IHandleMergeConflictAbortState
> {
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
        btnConfirmText: this.props.t('handle_merge_conflict.abort_merge_button_confirm'),
        descriptionText: this.props.t('handle_merge_conflict.abort_merge_message'),
        btnCancelText: this.props.t('handle_merge_conflict.abort_merge_button_cancel'),
      },
    });
  };

  public AbortConfirmed = async () => {
    const { org, app } = _useParamsClassCompHack();
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

      const abortRes = await get(abortmergePath(org, app));
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
  };

  public handleClose = () => {
    this.setState({
      anchorEl: null,
    });
  };

  public render() {
    const { popoverState } = this.state;

    return (
      <React.Fragment>
        <AltinnButton
          btnText={this.props.t('handle_merge_conflict.abort_merge_button')}
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
      </React.Fragment>
    );
  }
}

export default withTranslation()(HandleMergeConflictAbort);
