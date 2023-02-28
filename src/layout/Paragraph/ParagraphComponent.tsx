import React from 'react';

import { Grid, makeStyles, Typography } from '@material-ui/core';

import { HelpTextContainer } from 'src/features/form/components/HelpTextContainer';
import { getParsedLanguageFromText } from 'src/language/sharedLanguage';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { getPlainTextFromNode } from 'src/utils/stringHelper';
import type { PropsFromGenericComponent } from 'src/layout';

export type IParagraphProps = PropsFromGenericComponent<'Paragraph'>;

const useStyles = makeStyles({
  spacing: {
    '@media only screen': {
      letterSpacing: '0.3px',
      maxWidth: '684px',
      marginTop: '-12px',
    },
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
    '& *': {
      // TODO: Remove when switching to 'Inter'
      fontFamily: AltinnAppTheme.typography.fontFamily,
    },
  },
});

export function ParagraphComponent(props: IParagraphProps) {
  const classes = useStyles();

  const text = getParsedLanguageFromText(
    props.getTextResourceAsString(props?.textResourceBindings?.title ?? ''),
    {},
    false,
  );

  return (
    <Grid
      container={true}
      direction='row'
      alignItems='center'
    >
      <Grid item={true}>
        <Typography
          component={'div'}
          id={props.id}
          data-testid={`paragraph-component-${props.id}`}
          className={`${classes.spacing} ${classes.typography}`}
        >
          {text}
        </Typography>
      </Grid>
      {props.textResourceBindings?.help && (
        <Grid
          item={true}
          className={classes.spacing}
        >
          <HelpTextContainer
            language={props.language}
            helpText={props.getTextResourceAsString(props.textResourceBindings.help)}
            title={getPlainTextFromNode(text)}
          />
        </Grid>
      )}
    </Grid>
  );
}
