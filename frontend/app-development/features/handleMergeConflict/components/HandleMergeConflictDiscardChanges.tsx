import React from 'react';
import AltinnButton from 'app-shared/components/AltinnButton';
import AltinnPopover from 'app-shared/components/AltinnPopover';
import { get } from 'app-shared/utils/networking';
import postMessages from 'app-shared/utils/postMessages';
import { _useParamsClassCompHack } from 'app-shared/utils/_useParamsClassCompHack';
import { discardChangesPath } from 'app-shared/api-paths';
import i18next from 'i18next';
import { withTranslation } from 'react-i18next';


interface IHandleMergeConflictDiscardChangesProps {
  disabled?: boolean;
  t: typeof i18next.t;
}

interface IHandleMergeConflictDiscardChangesState {
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

export class HandleMergeConflictDiscardChanges extends React.Component<
  IHandleMergeConflictDiscardChangesProps,
  IHandleMergeConflictDiscardChangesState
> {
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
      popoverState: {
        ...this.state.popoverState,
        btnMethod: this.discardChangesConfirmed,
        btnConfirmText: this.props.t('handle_merge_conflict.discard_changes_button_confirm'),
        descriptionText: this.props.t('handle_merge_conflict.discard_changes_message'),
        btnCancelText: this.props.t('handle_merge_conflict.discard_changes_button_cancel'),
      },
    });
  };

  // TODO: Add a spinner
  public discardChangesConfirmed = async () => {
    const { org, app } = _useParamsClassCompHack();

    try {
      this.setState({
        popoverState: {
          ...this.state.popoverState,
          isLoading: true,
          btnText: null,
          btnCancelText: null,
        },
      });

      const discardRes = await get(discardChangesPath(org, app));

      this.setState({
        networkingRes: discardRes,
        popoverState: {
          ...this.state.popoverState,
          isLoading: false,
          shouldShowDoneIcon: true,
        },
      });

      window.postMessage(postMessages.forceRepoStatusCheck, window.location.href);
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
          id='discardMergeChangesBtn'
          btnText={this.props.t('handle_merge_conflict.discard_changes_button')}
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
      </React.Fragment>
    );
  }
}

export default withTranslation()(HandleMergeConflictDiscardChanges);
