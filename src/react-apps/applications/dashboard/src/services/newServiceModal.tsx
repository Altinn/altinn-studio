import { Modal, Typography, FormControl, TextField, InputAdornment, Button } from '@material-ui/core';
import { createMuiTheme, withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import { connect } from 'react-redux';
import AltinnIconButton from '../../../shared/src/components/AltinnIconButton';
import altinnTheme from '../../../shared/src/theme/altinnStudioTheme';
import { getLanguageFromKey } from '../../../shared/src/utils/language';
import AltinnInputField from '../../../shared/src/components/AltinnInputField';
import AltinnButton from '../../../shared/src/components/AltinnButton';

export interface INewServiceModalProvidedProps {
  classes: any;
}

export interface INewServiceModalProps extends INewServiceModalProvidedProps {
  language: any;
}

export interface INewServiceModalState {
  isOpen: boolean;
}

const theme = createMuiTheme(altinnTheme);

const styles = {
  modal: {
    width: '876px',
    backgroundColor: theme.altinnPalette.primary.white,
    boxShadow: theme.shadows[5],
    outline: 'none',
    marginRight: 'auto',
    marginLeft: 'auto',
    marginTop: '10%',
  },
  header: {
    backgroundColor: altinnTheme.altinnPalette.primary.blueDarker,
    height: '96px',
    paddingLeft: 48,
    paddingTop: 30,
    paddingBottom: 30,
  },
  headerText: {
    fontSize: '28px',
    color: altinnTheme.altinnPalette.primary.white,
  },
  body: {
    paddingLeft: 90,
    paddingRight: 243,
    paddingTop: 45,
    paddingBottom: 34,
  },
  inputHeader: {
    fontSize: '24px',
    marginBottom: '10px',
  },
  descriptionInput: {
    fontSize: '16px',
  },
  inputField: {
    border: '1px solid ' + theme.altinnPalette.primary.blueDark,
    marginTop: '10px',
    marginBottom: '24px',
    background: 'none',
    width: '386px',
  },
  button: {
    fontSize: '16px',
    padding: '5px 45px 5px 45px',
    height: '37px !Important',
  },

};

class NewServiceModalComponent extends React.Component<INewServiceModalProps, INewServiceModalState> {

  public state: INewServiceModalState = {
    isOpen: false,
  };

  public handleOpen = () => {
    this.setState({ isOpen: true });
  }

  public handleClose = () => {
    this.setState({ isOpen: false });
  }

  public render() {
    const { classes } = this.props;
    return (
      <div>
        <AltinnIconButton
          onclickFunction={this.handleOpen}
          btnText={getLanguageFromKey('dashboard.new_service', this.props.language)}
          iconClass='ai ai-circle-plus'
        />
        <Modal
          open={this.state.isOpen}
          onClose={this.handleClose}
        >
          <div className={classes.modal}>
            <div className={classes.header}>
              <Typography className={classes.headerText}>
                {getLanguageFromKey('dashboard.new_service_header', this.props.language)}
              </Typography>
            </div>
            <div className={classes.body}>
              <AltinnInputField
                id={'service-owner'}
                inputHeader={getLanguageFromKey('dashboard.service_owner', this.props.language)}
                inputDescription={getLanguageFromKey('dashboard.service_owner_description', this.props.language)}
              />
              <AltinnInputField
                id={'service-name'}
                inputHeader={getLanguageFromKey('dashboard.service_name', this.props.language)}
                inputDescription={getLanguageFromKey('dashboard.service_name_description', this.props.language)}
              />
              <AltinnInputField
                id={'service-saved-name'}
                inputHeader={getLanguageFromKey('dashboard.service_saved_name', this.props.language)}
                inputDescription={getLanguageFromKey('dashboard.service_saved_name_descripyion', this.props.language)}
              />
              <AltinnButton
                btnText={getLanguageFromKey('dashboard.create_service_btn', this.props.language)}
                className={classes.button}
              />
            </div>
          </div>
        </Modal>
      </div >
    );
  }
}

const mapStateToProps = (
  state: IDashboardAppState,
  props: INewServiceModalProvidedProps,
): INewServiceModalProps => {
  return {
    classes: props.classes,
    language: state.language.language,
  };
};

export const NewServiceModal = withStyles(styles)(connect(mapStateToProps)(NewServiceModalComponent));
