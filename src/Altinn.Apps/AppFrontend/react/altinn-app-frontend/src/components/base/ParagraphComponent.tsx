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

  var iconPos;
  var textArr;

  function replaceIcon(element, patern){

    for(var j=0; j < element.length; j++){
      if(element[j]['props']) {
        if(element[j]['props']['children']) {
          replaceIcon(element[j]['props']['children'], patern)
        }
      } else {
        iconPos = element[j].indexOf(patern);
        if(element[j].indexOf(patern) !== -1) {
            element[j] = 
              <> 
                {element[j].substring(0, iconPos)} 
                  <HelpTextContainer
                    language={props.language}
                    id={props.id}
                    helpText={props.getTextResource(props.textResourceBindings.help)}
                  /> 
                {element[j].substring(iconPos + 6)}
              </>;
        }
      }
    }
  }

  textArr = props.text;
  replaceIcon(textArr, '{help}')

  //non-recursive code
  // for(var i=0; i<textArr.length; i++) {
  //   if(textArr[i]['props']) {
  //     if(textArr[i]['props']['children']) {
  //       for(var j=0; j<textArr[i]['props']['children'].length; j++) {
  //         if(textArr[i]['props']['children'][j]['props']) {
  //           if(textArr[i]['props']['children'][j]['props']['children']) {
  //             for(var z=0; z<textArr[i]['props']['children'][j]['props']['children'].length; z++) {
  //               text = textArr[i]['props']['children'][j]['props']['children'][z].toString();
  //               placeIconTrue = text.indexOf('{help}'); 
    
  //               if(placeIconTrue !== -1) {
  //                 textArr[i]['props']['children'][j]['props']['children'][z] = 
  //                 <> 
  //                   {textArr[i]['props']['children'][j]['props']['children'][z].substring(0, placeIconTrue)} 
  //                     <HelpTextContainer
  //                       language={props.language}
  //                       id={props.id}
  //                       helpText={props.getTextResource(props.textResourceBindings.help)}
  //                     /> 
  //                   {textArr[i]['props']['children'][j]['props']['children'][z].substring(placeIconTrue + 6)}
  //                 </>;
  //               }
  //             }
  //           }
  //         }

  //         text = textArr[i]['props']['children'][j].toString();
  //         placeIconTrue = text.indexOf('{help}'); 

  //         if(placeIconTrue !== -1) {
  //           textArr[i]['props']['children'][j] = 
  //           <> 
  //             {textArr[i]['props']['children'][j].substring(0, placeIconTrue)} 
  //               <HelpTextContainer
  //                 language={props.language}
  //                 id={props.id}
  //                 helpText={props.getTextResource(props.textResourceBindings.help)}
  //               /> 
  //             {textArr[i]['props']['children'][j].substring(placeIconTrue + 6)}
  //           </>;
  //         }
  //       }
  //     }
  //   } else {
  //     text = textArr[i].toString();
  //     placeIconTrue = text.indexOf('{help}'); 

  //     if(placeIconTrue !== -1) {
  //       textArr[i] = 
  //       <>
  //           {textArr[i].substring(0, placeIconTrue)} 
  //             <HelpTextContainer
  //               language={props.language}
  //               id={props.id}
  //               helpText={props.getTextResource(props.textResourceBindings.help)}
  //             /> 
  //           {textArr[i].substring(placeIconTrue + 6)}
  //       </>;
  //     }
  //   }
  // }

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
      </Grid>
      }
    </Grid>
  );
}
