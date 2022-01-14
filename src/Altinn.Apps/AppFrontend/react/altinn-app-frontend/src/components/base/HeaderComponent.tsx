import { Grid } from '@material-ui/core';
import { ILanguage } from 'altinn-shared/types';
import * as React from 'react';
import { HelpTextContainer } from 'src/features/form/components/HelpTextContainer';
import { ITextResourceBindings } from 'src/types';
import { replaceHelpWithIcon } from '../..//../src/utils/replaceIcon';
export interface IHeaderProps {
  id: string;
  text: string;
  size?: string;
  textResourceBindings: ITextResourceBindings;
  language: ILanguage;
  getTextResource: (key: string) => string;
}

const marginStyling = {
  marginTop: '0',
  marginBottom: '0',
};

<<<<<<< HEAD
  const header = replaceHelpWithIcon({
    element: props.text,
    language: props.language,
    id: props.id,
    text: props.getTextResource(props.textResourceBindings.help)
  });

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
=======
interface IHeaderSizeProps {
  id: string;
  text: string;
  size?: string;
}

const HeaderSize = ({ id, size, text }: IHeaderSizeProps) => {
  switch (size) {
    case 'L':
    case 'h2': {
      return (
        <h2 id={id} style={marginStyling}>
          {text}
        </h2>
      );
    }

    case 'M':
    case 'h3': {
      return (
        <h3 id={id} style={marginStyling}>
          {text}
        </h3>
      );
    }

    case 'S':
    case 'h4':
    default: {
      return (
        <h4 id={id} style={marginStyling}>
          {text}
        </h4>
      );
>>>>>>> master
    }
  }
};

export const HeaderComponent = ({
  id,
  size,
  text,
  textResourceBindings,
  language,
  getTextResource,
}: IHeaderProps) => {
  return (
    <Grid container={true} direction='row' alignItems='center'>
      <Grid item={true}>
        <HeaderSize id={id} size={size} text={text} />
      </Grid>
      {textResourceBindings?.help && (
        <Grid item={true} style={marginStyling}>
          <HelpTextContainer
            language={language}
            id={id}
            helpText={getTextResource(textResourceBindings.help)}
          />
        </Grid>
      )}
    </Grid>
  );
};
