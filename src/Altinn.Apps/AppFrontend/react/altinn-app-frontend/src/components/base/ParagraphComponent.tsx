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
  console.log(props.text);

  var text;
  var placeIconTrue;
  var textArr;
  var idxHelp;
  var startPos;

textArr = props.text[0]['props']['children'];

  for(var i=0; i<textArr.length; i++) {
  // code for bold text
  //   if(textArr[i]['props']) {
  //     if(textArr[i]['props']['children']) {
  //       text = textArr[i]['props']['children'][0].toString();
  //       placeIconTrue = text.indexOf('{help}'); 

  //       if(placeIconTrue !== -1) {
  //         idxHelp = i;
  //         startPos = placeIconTrue;
  //       }
  //     }
  //   } else {
      text = textArr[i].toString();
      placeIconTrue = text.indexOf('{help}'); 

      if(placeIconTrue !== -1) {
        idxHelp = i;
        startPos = placeIconTrue;
      }
    // }
  }

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
        </Typography>
      </Grid>
      {props.textResourceBindings?.help &&
      <Grid item={true} className={classes.spacing}>
          {textArr.slice(0,idxHelp)}
          {textArr[idxHelp].substring(0, startPos)}
        <HelpTextContainer
          language={props.language}
          id={props.id}
          helpText={props.getTextResource(props.textResourceBindings.help)}
        />
          {textArr[idxHelp].substring(startPos + 6)}
          {textArr.slice(idxHelp + 1)}
      </Grid>
      }
    </Grid>
  );
}
