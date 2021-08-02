import { createTheme, Grid, makeStyles, Popover, Typography } from '@material-ui/core';
import * as React from 'react';
import studioTheme from 'app-shared/theme/altinnStudioTheme';
import AltinnButton from 'app-shared/components/AltinnButton';

export interface IConfirmModalProps {
  header: string;
  description: string;
  confirmText: string;
  cancelText: string;
  anchorEl: null | Element;
  open: boolean;
  onClose: (event: React.SyntheticEvent) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const theme = createTheme(studioTheme);

const useStyles = makeStyles({
  main: {
    padding: 30,
    maxWidth: 470,
  },
  header: {
    marginBottom: 12,
  },
  content: {
    marginBottom: 24,
  },
  confirmButton: {
    backgroundColor: theme.altinnPalette.primary.red,
    color: theme.altinnPalette.primary.white,
  },
});

export default function ConfirmModal(props: IConfirmModalProps) {
  const classes = useStyles();
  return (
    <Popover
      open={props.open}
      anchorEl={props.anchorEl}
      anchorOrigin={{
        vertical: 'center',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'center',
        horizontal: 'center',
      }}
      onClose={props.onClose}
    >
      <Grid
        container={true} direction='column'
        className={classes.main}
      >
        <Grid item={true} className={classes.header}>
          <Typography variant='h2'>
            {props.header}
          </Typography>
        </Grid>
        <Grid item={true} className={classes.content}>
          <Typography variant='body1'>
            {props.description}
          </Typography>
        </Grid>
        <Grid
          container={true}
          direction='row'
          xs={12}
        >
          <Grid item={true} xs={6}>
            <AltinnButton
              onClickFunction={props.onConfirm}
              btnText={props.confirmText}
              className={classes.confirmButton}
            />
          </Grid>
          <Grid item={true} xs={6}>
            <AltinnButton
              onClickFunction={props.onCancel}
              btnText={props.cancelText}
              secondaryButton={true}
            />
          </Grid>
        </Grid>
      </Grid>
    </Popover>
  );
}
