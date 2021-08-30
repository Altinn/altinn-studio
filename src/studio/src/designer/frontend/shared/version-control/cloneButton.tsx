import { Button, createTheme, createStyles, Grid, Typography, WithStyles, withStyles } from '@material-ui/core';
import * as React from 'react';
import AltinnIcon from '../components/AltinnIcon';
import altinnTheme from '../theme/altinnStudioTheme';

const theme = createTheme(altinnTheme);

const styles = createStyles({
  cloneButton: {
    textTransform: 'none',
    padding: 0,
    '&:hover': {
      backgroundColor: 'transparent !Important',
    },
    '&:focus': {
      backgroundColor: 'transparent !Important',
    },
  },
});

export interface ICloneButtonProps extends WithStyles<typeof styles> {
  onClick: (event: React.MouseEvent) => void;
  buttonText: string;
}

function CloneButton(props: ICloneButtonProps) {
  return (
    <Button onClick={props.onClick} className={props.classes.cloneButton}>
      <Grid container={true} alignItems='center'>
        <Grid item={true}>
          <AltinnIcon
            iconClass='fa fa-clone'
            iconColor={theme.altinnPalette.primary.blueDark}
            iconSize={24}
            padding='0px 0px 4px 0px'
          />
        </Grid>
        <Grid item={true}>
          <Typography
            style={{ color: theme.altinnPalette.primary.blueDark }}
            variant='body1'
          >
            {props.buttonText}
          </Typography>
        </Grid>
      </Grid>
    </Button>
  );
}

export default withStyles(styles)(CloneButton);
