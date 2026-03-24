import React from 'react';

import { HelpText } from 'src/app-components/HelpText/HelpText';
import { translationKey } from 'src/AppComponentsBridge';
import classes from 'src/components/form/HelpTextContainer.module.css';

export interface IHelpTextContainerProps {
  id?: string;
  helpText: React.ReactNode;
  title?: string;
}

export function HelpTextContainer({ id, helpText, title }: IHelpTextContainerProps) {
  return (
    <HelpText
      id={id ? `${id}-helptext` : undefined}
      titlePrefix={title ? translationKey('helptext.button_title_prefix') : undefined}
      title={title ? translationKey(title) : translationKey('helptext.button_title')}
      className={classes.helpTextContainer}
    >
      {helpText}
    </HelpText>
  );
}
