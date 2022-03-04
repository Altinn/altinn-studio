import * as React from 'react';
import { Grid, makeStyles, Typography } from '@material-ui/core';
import { HelpTextContainer } from 'src/features/form/components/HelpTextContainer';
import { IComponentProps } from '..';


const useStyles = makeStyles({
  spacing: {
    letterSpacing: '0.3px',
    maxWidth: '684px',
    marginTop: '-12px',
  },
  // Class to override default stylings for headers created by markdown parsing. Done to align help text icon.
  typography: {
    '& h1': {
      margin: 0,
    },
    '& h2': {
      margin: 0,
    },
    '& h3': {
      margin: 0,
    },
    '& h4': {
      margin: 0,
    },
    '& h5': {
      margin: 0,
    },
    '& h6': {
      margin: 0,
    },
  },
});

export function ParagraphComponent(props: IComponentProps) {
  const classes = useStyles();
  return (
    <Grid
      container={true}
      direction='row'
      alignItems='center'
    >
      <Grid item={true}>
        <Typography
          id={props.id}
          className={`${classes.spacing} ${classes.typography}`}
        >
          {props.text}
        </Typography>
      </Grid>
      {props.textResourceBindings?.help &&
      <Grid item={true} className={classes.spacing}>
        <HelpTextContainer
          language={props.language}
          helpText={props.getTextResource(props.textResourceBindings.help)}
        />
      </Grid>
      }
    </Grid>
  );
}
