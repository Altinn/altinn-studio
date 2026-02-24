import React from 'react';

import { HelpText } from 'src/app-components/HelpText/HelpText';
import classes from 'src/components/form/HelpTextContainer.module.css';
import { useLanguage } from 'src/features/language/useLanguage';

export interface IHelpTextContainerProps {
  id?: string;
  helpText: React.ReactNode;
  title?: string;
}

export function HelpTextContainer({ id, helpText, title }: IHelpTextContainerProps) {
  const { langAsString } = useLanguage();
  return (
    <HelpText
      id={id ? `${id}-helptext` : undefined}
      title={title ? `${langAsString('helptext.button_title_prefix')} ${title}` : langAsString('helptext.button_title')}
      className={classes.helpTextContainer}
    >
      {helpText}
    </HelpText>
  );
}
