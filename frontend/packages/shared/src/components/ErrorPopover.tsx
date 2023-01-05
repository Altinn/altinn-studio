import React from 'react';
import { Grid, Typography } from '@mui/material';
import AltinnPopover from './molecules/AltinnPopoverSimple';
import classes from './ErrorPopover.module.css';

export interface IErrorPopoverProps {
  anchorEl: Element | ((element: Element) => Element);
  onClose: (event: Record<string, unknown>, reason: 'backdropClick' | 'escapeKeyDown') => void;
  errorMessage: string;
}

export default function ErrorPopover({ anchorEl, onClose, errorMessage }: IErrorPopoverProps) {
  return (
    <AltinnPopover
      open={!!anchorEl}
      anchorEl={anchorEl}
      handleClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      paperProps={{
        classes: {
          root: classes.popoverRoot,
        },
      }}
    >
      <Grid container={true} direction='row' spacing={3} alignItems='center'>
        <Grid
          item={true}
          xs={1}
          style={{
            padding: 0,
          }}
        >
          <i className={`${classes.errorIcon} ai ai-circle-exclamation`} />
        </Grid>
        <Grid
          item={true}
          xs={11}
          style={{
            padding: 0,
          }}
        >
          <Typography className={classes.errorText}>{errorMessage}</Typography>
        </Grid>
      </Grid>
    </AltinnPopover>
  );
}
