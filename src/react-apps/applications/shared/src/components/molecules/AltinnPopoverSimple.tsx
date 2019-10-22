import { Button, createMuiTheme, createStyles, Grid, makeStyles, Popover } from '@material-ui/core';
import * as React from 'react';
import altinnTheme from '../../theme/altinnStudioTheme';

export interface IAltinnPopoverProvidedProps {
  anchorEl: any;
  anchorOrigin: {
    horizontal: 'left' | 'center' | 'right' | number,
    vertical: 'top' | 'center' | 'bottom' | number,
  };
  btnClick?: any;
  btnConfirmText?: string;
  btnCancelText?: string;
  btnPrimaryId?: string;
  btnSecondaryId?: string;
  handleClose: any;
  paperProps?: any;
  transformOrigin: {
    horizontal: 'left' | 'center' | 'right' | number,
    vertical: 'top' | 'center' | 'bottom' | number,
  };
}

export interface IAltinnPopoverProps extends IAltinnPopoverProvidedProps {

}

export interface IAltinnPopoverState {

}

const theme = createMuiTheme(altinnTheme);

const useStyles = makeStyles(() =>
  createStyles({
    borderBottom: {
      borderBottom: '1px solid' + altinnTheme.altinnPalette.primary.blueDark,
    },
    buttonCancel: {
      'fontSize': '14px',
      'color': theme.altinnPalette.primary.blueDarker,
      'background': theme.altinnPalette.primary.white,
      'textTransform': 'none',
      'fontWeight': 400,
      'marginTop': '20px',
      'borderRadius': '0',
      '&:hover': {
        color: theme.altinnPalette.primary.blueDarker,
      },
      '&:focus': {
        background: theme.altinnPalette.primary.blueDarker,
        color: theme.altinnPalette.primary.white,
      },
    },
    buttonConfirm: {
      'fontSize': '14px',
      'color': theme.altinnPalette.primary.white,
      'background': theme.altinnPalette.primary.blueDark,
      'textTransform': 'none',
      'fontWeight': 400,
      'marginTop': '20px',
      'borderRadius': '0',
      '&:hover': {
        background: theme.altinnPalette.primary.blueDarker,
        color: theme.altinnPalette.primary.white,
      },
      '&:focus': {
        background: theme.altinnPalette.primary.blueDarker,
        color: theme.altinnPalette.primary.white,
      },
    },
    popover: {
      width: '445px',
      margin: '24px',
    },
  },
  ),
);

const AltinnPopoverComponent = (props: any) => {
  const classes = useStyles(props);

  const handleClose = () => {
    props.handleClose();
  };

  const btnClickedHandler = () => {
    if (props.btnClick) {
      props.btnClick();
    }
  };

  return (
    <>
      <Popover
        open={props.anchorEl ? true : false}
        anchorEl={props.anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          horizontal: props.anchorOrigin.horizontal ? props.anchorOrigin.horizontal : 'left',
          vertical: props.anchorOrigin.vertical ? props.anchorOrigin.vertical : 'top',
        }}
        transformOrigin={{
          horizontal: props.transformOrigin.horizontal ? props.transformOrigin.horizontal : 'left',
          vertical: props.transformOrigin.vertical ? props.transformOrigin.vertical : 'top',
        }}
        anchorReference='anchorEl'
        PaperProps={{ square: true, ...props.paperProps }}
      >
        <Grid container={true} direction='column' className={classes.popover}>
          <Grid item={true}>
            <div>
              {props.children}
            </div>
          </Grid>
          <Grid item={true}>
          <div>
            {props.btnConfirmText &&
              <Button
                id={props.btnPrimaryId}
                variant='contained'
                color='primary'
                className={classes.buttonConfirm}
                onClick={btnClickedHandler}
              >
                {props.btnConfirmText}
              </Button>
            }
            {props.btnCancelText &&
              <Button
                id={props.btnSecondaryId}
                color='primary'
                className={classes.buttonCancel}
                onClick={props.handleClose}
              >
                <span className={classes.borderBottom}>
                  {props.btnCancelText}
                </span>
              </Button>
            }
          </div>
          </Grid>
        </Grid>
      </Popover>
    </>
  );
};

export default AltinnPopoverComponent;
