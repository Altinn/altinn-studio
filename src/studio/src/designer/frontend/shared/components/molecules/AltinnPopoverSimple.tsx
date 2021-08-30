import { Button, createTheme, createStyles, Grid, makeStyles } from '@material-ui/core';
import Popover, { PopoverOrigin } from '@material-ui/core/Popover';
import * as React from 'react';
import altinnTheme from '../../theme/altinnStudioTheme';

export interface IAltinnPopoverProps {
  anchorEl: any;
  anchorOrigin: PopoverOrigin;
  btnClick?: any;
  btnConfirmText?: string;
  btnCancelText?: string;
  btnPrimaryId?: string;
  btnSecondaryId?: string;
  handleClose: any;
  paperProps?: any;
  transformOrigin?: PopoverOrigin;
  backgroundColor?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}

const theme = createTheme(altinnTheme);

const useStyles = makeStyles(() => createStyles({
  borderBottom: {
    borderBottom: `1px solid ${altinnTheme.altinnPalette.primary.blueDark}`,
  },
  buttonCancel: {
    fontSize: '14px',
    color: theme.altinnPalette.primary.blueDarker,
    background: theme.altinnPalette.primary.white,
    textTransform: 'none',
    fontWeight: 400,
    marginTop: '20px',
    borderRadius: '0',
    '&:hover': {
      color: theme.altinnPalette.primary.blueDarker,
    },
    '&:focus': {
      background: theme.altinnPalette.primary.blueDarker,
      color: theme.altinnPalette.primary.white,
    },
  },
  buttonConfirm: {
    fontSize: '14px',
    color: theme.altinnPalette.primary.white,
    background: theme.altinnPalette.primary.blueDark,
    textTransform: 'none',
    fontWeight: 400,
    marginTop: '20px',
    borderRadius: '0',
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
}));

const defaultAnchorOrigin: PopoverOrigin = {
  horizontal: 'left',
  vertical: 'top',
};

const defaultTransformOrigin: PopoverOrigin = {
  horizontal: 'left',
  vertical: 'top',
};

const AltinnPopoverComponent = (props: IAltinnPopoverProps) => {
  const {
    anchorOrigin = defaultAnchorOrigin,
    transformOrigin = defaultTransformOrigin,
  } = props;

  const classes = useStyles(props);

  const handleButtonClose = (event: React.MouseEvent<HTMLElement>) => {
    props.handleClose('close', event);
  };

  const btnClickedHandler = (event: React.MouseEvent<HTMLElement>) => {
    if (props.btnClick) {
      props.btnClick(event);
    }
  };

  return (
    <>
      <Popover
        open={!!props.anchorEl}
        anchorEl={props.anchorEl}
        onClose={props.handleClose}
        anchorOrigin={anchorOrigin}
        transformOrigin={transformOrigin}
        anchorReference='anchorEl'
        PaperProps={{ square: true, ...props.paperProps }}
        aria-label={props.ariaLabel ? props.ariaLabel : ''}
      >
        <Grid
          container={true} direction='column'
          className={classes.popover}
        >
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
                  onClick={handleButtonClose}
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
