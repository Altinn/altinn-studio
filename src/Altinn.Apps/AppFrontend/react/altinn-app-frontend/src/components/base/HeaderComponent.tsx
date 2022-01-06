import { Grid } from '@material-ui/core';
import * as React from 'react';
import { HelpTextContainer } from 'src/features/form/components/HelpTextContainer';
import { ITextResourceBindings } from 'src/types';

export interface IHeaderProps {
  id: string;
  text: string;
  size?: string;
  textResourceBindings: ITextResourceBindings;
  language: any;
  getTextResource: (key: string) => string;
}

export function HeaderComponent(props: IHeaderProps) {
  const marginStyling = {
    marginTop: '4.8rem',
    marginBottom: '0',
  };

  var iconPos;
  var textArr;
  const replacePattern = '{help}';

  function replaceIcon(element, pattern){
    
    const iconPos = element.indexOf(pattern);

    if(element.indexOf(pattern) !== -1) {
      header = 
          <> 
            {element.substring(0, iconPos)} 
            <HelpTextContainer
              language={props.language}
              id={props.id}
              helpText={props.getTextResource(props.textResourceBindings.help)}
            />
            {element.substring(iconPos + replacePattern.length)}
          </>;
    }
  }

  var header;
  textArr = props.text;
  replaceIcon(textArr, replacePattern);

  const renderHeader = () => {



    switch (props.size) {
      case ('S'): {
        return <h4 id={props.id} style={marginStyling}>{header}</h4>;
      }

      case ('M'): {
        return <h3 id={props.id} style={marginStyling}>{header}</h3>;
      }

      case ('L'): {
        return <h2 id={props.id} style={marginStyling}>{header}</h2>;
      }

      default: {
        return <h4 id={props.id} style={marginStyling}>{header}</h4>;
      }
    }
  };

  return (
    <Grid
      container={true}
      direction='row'
      alignItems='center'
    >
      <Grid item={true}>
        {renderHeader()}
      </Grid>
      {props.textResourceBindings?.help &&
      <Grid item={true} style={marginStyling}>
      </Grid>}
    </Grid>
  );
}
