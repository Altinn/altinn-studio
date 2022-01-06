import * as React from 'react';
import { Grid, makeStyles, Typography } from '@material-ui/core';
import { ITextResourceBindings } from 'src/features/form/layout';
import { HelpTextContainer } from 'src/features/form/components/HelpTextContainer';

export interface IParagraphProps {
  id: string;
  text: string;
  textResourceBindings: ITextResourceBindings;
  language: any;
  getTextResource: (key: string) => string;
}

const useStyles = makeStyles({
  spacing: {
    letterSpacing: '0.3px',
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

  const replacePattern = '{help}';
  var textArr;
  
  function replaceIcon(element, pattern){

    var iconPos;

    for(var j=0; j < element.length; j++){
      if(element[j]['props']) {
        if(element[j]['props']['children']) {
          replaceIcon(element[j]['props']['children'], pattern)
        }
      } else {
        iconPos = element[j].indexOf(pattern);
        if(element[j].indexOf(pattern) !== -1) {
            element[j] = 
              <> 
                {element[j].substring(0, iconPos)} 
                  <HelpTextContainer
                    language={props.language}
                    id={props.id}
                    helpText={props.getTextResource(props.textResourceBindings.help)}
                  /> 
                {element[j].substring(iconPos + replacePattern.length)}
              </>;
        }
      }
    }
  }

  textArr = props.text;
  replaceIcon(textArr, replacePattern);

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
      {props.textResourceBindings?.help}
    </Grid>
  );
}
