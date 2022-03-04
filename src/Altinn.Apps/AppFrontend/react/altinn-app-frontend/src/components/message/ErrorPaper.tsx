import { Paper, Grid, createTheme, makeStyles } from '@material-ui/core';
import * as React from 'react';
import { AltinnAppTheme } from 'altinn-shared/theme';

export interface IErrorPaperProps {
  message: string;
}

const theme = createTheme(AltinnAppTheme);

const gridStyle = {
  paddingRight: '6px',
};

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
    <Paper className={classes.paper} square={true}>
      <Grid
        container={true}
        alignItems='center'
        direction='row'
        justifyContent='flex-start'
        className={classes.grid}
        spacing={2}
      >
        <Grid item={true} xs={2} style={gridStyle}>
          <i className='ai ai-circle-exclamation' />
        </Grid>
        <Grid item={true} xs={10}>
          {props.message}
        </Grid>
      </Grid>
    </Paper>
  );
}
