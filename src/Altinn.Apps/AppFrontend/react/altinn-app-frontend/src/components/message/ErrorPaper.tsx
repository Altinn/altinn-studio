import { Paper, Grid, createMuiTheme, makeStyles } from '@material-ui/core';
import * as React from 'react';
import { AltinnAppTheme } from 'altinn-shared/theme';

export interface IErrorPaperProps {
  message: string,
}

const theme = createMuiTheme(AltinnAppTheme);

const useStyles = makeStyles({
  paper: {
    backgroundColor: theme.altinnPalette.primary.redLight,
    maxWidth: '330px',
  },
  grid: {
    padding: '12px',
  },
});

export default function ErrorPaper(props: IErrorPaperProps) {
  const classes = useStyles();
  return (
    <Paper
      className={classes.paper}
      square={true}
    >
      <Grid
        container={true}
        alignItems='center'
        direction='row'
        justify='flex-start'
        className={classes.grid}
        spacing={2}
      >
        <Grid
          item={true}
          xs={2}
          style={{ paddingRight: '6px' }}
        >
          <i className='ai ai-circle-exclamation'/>
        </Grid>
        <Grid item={true} xs={10} >
          {props.message}
        </Grid>
      </Grid>
    </Paper>
  );
}
