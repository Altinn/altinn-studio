import React from 'react';

import { HelpText } from '@app/form-component/app-components/HelpText';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';

import classes from './HelpTextContainer.module.css';

export interface IHelpTextContainerProps {
  id?: string;
  helpText: React.ReactNode;
  title?: string;
}

export function HelpTextContainer({ id, helpText, title }: IHelpTextContainerProps) {
  const { langAsString } = useTranslation();
  return (
    <HelpText
      id={id ? `${id}-helptext` : undefined}
      titlePrefix={title ? langAsString('helptext.button_title_prefix') : undefined}
      title={title ? langAsString(title) : langAsString('helptext.button_title')}
      className={classes.helpTextContainer}
    >
      {helpText}
    </HelpText>
  );
}
