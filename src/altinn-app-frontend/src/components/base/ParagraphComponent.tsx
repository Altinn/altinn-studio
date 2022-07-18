import React from 'react';
import { Grid, makeStyles, Typography } from '@material-ui/core';
import { HelpTextContainer } from 'src/features/form/components/HelpTextContainer';
import type { IComponentProps } from '..';
import type { ILayoutCompParagraph } from 'src/features/form/layout';

export type IParagraphProps = IComponentProps &
  Omit<ILayoutCompParagraph, 'type'>;

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
  const isHeader =
    typeof props.text === 'object' &&
    typeof (props.text as any).type === 'string' &&
    (props.text as any).type.match(/^h\d+$/);

  return (
    <Grid
      container={true}
      direction='row'
      alignItems='center'
    >
      <Grid item={true}>
        <Typography
          component={isHeader ? 'div' : 'p'}
          id={props.id}
          data-testid={`paragraph-component-${props.id}`}
          className={`${classes.spacing} ${classes.typography}`}
        >
          {props.text}
        </Typography>
      </Grid>
      {props.textResourceBindings?.help && (
        <Grid
          item={true}
          className={classes.spacing}
        >
          <HelpTextContainer
            language={props.language}
            helpText={props.getTextResource(props.textResourceBindings.help)}
          />
        </Grid>
      )}
    </Grid>
  );
}
