import * as React from 'react';
import { Grid, Typography } from '@material-ui/core';
import { ITextResourceBindings } from 'src/features/form/layout';
import { HelpTextContainer } from 'src/features/form/components/HelpTextContainer';

export interface IParagraphProps {
  id: string;
  text: string;
  textResourceBindings: ITextResourceBindings;
  language: any;
  getTextResource: (key: string) => string;
}

export function ParagraphComponent(props: IParagraphProps) {
  const style = {
    marginTop: '2.4rem',
    letterSpacing: '0.3px',
  };

  return (
    <Grid container={true} direction='row'>
      <Grid item={true}>
        <Typography
          id={props.id}
          style={style}
        >
          {props.text}
        </Typography>
      </Grid>
      {props.textResourceBindings?.help &&
      <Grid item={true} style={style}>
        <HelpTextContainer
          language={props.language}
          id={props.id}
          helpText={props.getTextResource(props.textResourceBindings.help)}
        />
      </Grid>
      }
    </Grid>
  );
}
