import { Grid } from '@material-ui/core';
import { createMuiTheme, createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import * as React from 'react';
import AltinnButton from '../../../../../shared/src/components/AltinnButton';
// import AltinnIcon from '../../../../../shared/src/components/AltinnIcon';
import AltinnPopover from '../../../../../shared/src/components/AltinnPopover';
import AltinnInput from '../../../../../shared/src/components/AltinnInput';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import { get, post } from '../../../../../shared/src/utils/networking';
// import { makeGetApiConnectionsSelector } from '../../../../../ux-editor/src/selectors/getServiceConfigurations';
const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  validateButtons: {
    marginleft: 92,
  },
  buttonGridItem: {
    textAlign: 'right',
  },
  theme: {
    border: theme.accessability.focusVisible.border,
  },
});

export interface IHandleMergeConflictValidateChangesProps extends WithStyles<typeof styles> {
  language: any;
  repoStatus: any;
}

export interface IHandleMergeConflictValidateChangesState {
  anchorEl: any;
  popoverState: any;
  form: {
    commitMessageInput: string;
  };
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

  public validateChanges = async () => {
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
    const pullUrl = `${altinnWindow.location.origin}/designerapi/Repository/Pull?owner=${org}&repository=${service}`;

    //const commitResult = await post(commitUrl, commitBody, options);
    //console.log('commitResult', commitResult);
    const pullResult = await get(pullUrl);
    console.log('pullResult', pullResult);

  }

  public validateChangesPopover = (event: any) => {
    this.setState({
      anchorEl: event.currentTarget,
    });
  }

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
    console.log('target.id', event.target.value)
    const target = event.target;
    //Use target.type checkbox if checkbox is used.
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
          xs={12}
        >
          <Grid
            container={true}
            item={true}
            xs={6}
            direction='column'
            justify='flex-end'
            alignItems='stretch'
          >
            <Grid xs={12}>
              TEXT_beskrive endringene dine
            </Grid>
            <Grid xs={12}>
              <span >

                <AltinnInput
                  id='commitMessageInput'
                  onChangeFunction={this.handleFormChange}
                  fullWidth={true}
                  disabled={repoStatus.hasMergeConflict}
                />
              </span>
            </Grid>

          </Grid>
          <Grid
            xs={4}
            className={classes.buttonGridItem}
          >
            <span className={classes.validateButtons}>
              <AltinnButton
                btnText={getLanguageFromKey('general.validate_changes', this.props.language)}
                onClickFunction={this.validateChanges}
                disabled={repoStatus.hasMergeConflict}
              />

              <AltinnButton
                btnText={getLanguageFromKey('general.cancel', this.props.language)}
                secondaryButton={true}
              />
            </span>

          </Grid>

        </Grid>

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

export default withStyles(styles)(HandleMergeConflictValidateChanges);
