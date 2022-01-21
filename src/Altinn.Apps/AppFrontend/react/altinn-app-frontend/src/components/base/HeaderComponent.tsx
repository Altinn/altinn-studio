import { Grid } from '@material-ui/core';
import { ILanguage } from 'altinn-shared/types';
import * as React from 'react';
import { ITextResourceBindings } from 'src/types';
import { replaceHelpWithIcon, checkIfIcon } from '../..//../src/utils/replaceIcon';
import { HelpTextContainer } from 'src/features/form/components/HelpTextContainer';

export interface IHeaderProps {
  id: string;
  text: string;
  size?: string;
  textResourceBindings: ITextResourceBindings;
  language: ILanguage;
  getTextResource: (key: string) => string;
  getTextResourceAsString: (resourceKey: string) => string;
}

const marginStyling = {
  marginTop: '0',
  marginBottom: '0',
};

interface IHeaderSizeProps {
  id: string;
  text: string;
  size?: string;
  language: any;
  helpText: string;
  hasPattern: boolean;
}

const HeaderSize = ({ id, size, text, language, helpText, hasPattern }: IHeaderSizeProps) => {

  const header = replaceHelpWithIcon({
    element: text,
    language: language,
    id: id,
    text: helpText,
    hasPattern
  });

  switch (size) {
    case 'L':
    case 'h2': {
      return (
        <h2 id={id} style={marginStyling}>
          {header}
        </h2>
      );
    }

    case 'M':
    case 'h3': {
      return (
        <h3 id={id} style={marginStyling}>
          {header}
        </h3>
      );
    }

    case 'S':
    case 'h4':
    default: {
      return (
        <h4 id={id} style={marginStyling}>
          {header}
        </h4>
      );
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
  getTextResourceAsString
}: IHeaderProps) => {
    let hasPattern = false;
    hasPattern = checkIfIcon(getTextResourceAsString(textResourceBindings.title));

  return (
    <Grid container={true} direction='row' alignItems='center'>
      <Grid item={true}>
        <HeaderSize id={id} size={size} text={text} language={language} helpText={getTextResource(textResourceBindings.help)} hasPattern={hasPattern} />
      </Grid>
      {textResourceBindings.help && !hasPattern && <HelpTextContainer language={language} id={id} helpText={getTextResource(textResourceBindings.help)} />}
    </Grid>
  );
};
