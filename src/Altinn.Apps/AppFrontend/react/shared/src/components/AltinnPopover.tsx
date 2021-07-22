import { createTheme, createStyles, Grid, makeStyles, Popover, Typography } from '@material-ui/core';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnAppTheme';
import { AltinnButton } from './AltinnButton';

export interface IAltinnPopoverProvidedProps {
  anchorEl: any;
  anchorOrigin?: {
    horizontal: 'left' | 'center' | 'right' | number,
    vertical: 'top' | 'center' | 'bottom' | number,
  };
  btnClick?: any;
  btnConfirmText?: string;
  btnCancelText?: string;
  btnPrimaryId?: string;
  btnSecondaryId?: string;
  classes: any;
  descriptionText?: string;
  handleClose: any;
  header?: string;
  isLoading?: boolean;
  nextTobtnConfirmText?: string;
  paperProps?: any;
  shouldShowCommitBox?: boolean;
  shouldShowDoneIcon?: boolean;
  transformOrigin?: {
    horizontal: 'left' | 'center' | 'right' | number,
    vertical: 'top' | 'center' | 'bottom' | number,
  };
  closeButton?: boolean;
  closeButtonText?: string;
}

const theme = createTheme(altinnTheme);

const useStyles = makeStyles(() => createStyles({
  borderBottom: {
    borderBottom: `1px solid${theme.altinnPalette.primary.blueDark}`,
  },
  header: {
    fontSize: '16px',
    fontWeight: 500,
    marginBottom: '10px',
  },
  subHeader: {
    fontSize: '16px',
  },
  popover: {
    width: 'auto',
    maxWidth: '445px',
    margin: '24px',
  },
  textWrap: {
    wordBreak: 'break-word',
  },
  removeMargin: {
    marginBottom: '-18px',
  },
  button: {
    marginTop: '12px',
  },
}));

const AltinnPopoverComponent = (props: any) => {
  const classes = useStyles(props);
  const handleClose = () => {
    props.handleClose();
  };

  return (
    <>
      <Popover
        open={!!props.anchorEl}
        anchorEl={props.anchorEl}
        onClose={handleClose}
        onBlur={handleClose}
        anchorOrigin={{
          horizontal: props.anchorOrigin.horizontal ? props.anchorOrigin.horizontal : 'left',
          vertical: props.anchorOrigin.vertical ? props.anchorOrigin.vertical : 'top',
        }}
        transformOrigin={{
          horizontal: props.transformOrigin.horizontal ? props.transformOrigin.horizontal : 'left',
          vertical: props.transformOrigin.vertical ? props.transformOrigin.vertical : 'top',
        }}
        PaperProps={{ square: true, ...props.paperProps }}
      >
        <Grid
          container={true}
          direction='column'
          className={classes.popover}
          aria-live='assertive'
          role='alert'
        >
          {props.header &&
            <Typography
              variant='h3'
              className={classNames(classes.header)}
              id='header'
            >
              {props.header}
            </Typography>
          }

          {props.descriptionText &&
            <div
              className={classNames(classes.textWrap)}
            >
              {props.descriptionText}
            </div>
          }
          {props.children}
          {
            props.closeButton &&
            <div
              className={classNames(classes.button)}
            >
              <AltinnButton
                btnText={props.closeButtonText}
                onClickFunction={handleClose}
              />
            </div>
          }
        </Grid>
      </Popover>
    </>
  );
};

export default AltinnPopoverComponent;
