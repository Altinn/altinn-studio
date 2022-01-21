import * as React from 'react';
import { Grid, makeStyles, Typography } from '@material-ui/core';
import { ITextResourceBindings } from 'src/features/form/layout';
import { insertHelpIconInNested, checkIfIcon } from '../../../src/utils/replaceIcon';
import { ILanguage } from 'altinn-shared/types';
import { HelpTextContainer } from 'src/features/form/components/HelpTextContainer';

export interface IParagraphProps {
  id: string;
  text: string;
  textResourceBindings: ITextResourceBindings;
  language: ILanguage;
  getTextResource: (key: string) => string;
  getTextResourceAsString: (resourceKey: string) => string;
}

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

export function ParagraphComponent(props: IParagraphProps) {
  const classes = useStyles();
  let hasPattern = false;
  hasPattern = checkIfIcon(props.getTextResourceAsString(props.textResourceBindings.title));

  insertHelpIconInNested({
    element: props.text,
    language: props.language,
    id: props.id,
    text: props.getTextResource(props.textResourceBindings.help),
    hasPattern
  });

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
          {props.textResourceBindings.help && !hasPattern && <HelpTextContainer language={props.language} id={props.id} helpText={props.getTextResource(props.textResourceBindings.help)} />}
        </Typography>
      </Grid>
    </Grid>
  );
}
