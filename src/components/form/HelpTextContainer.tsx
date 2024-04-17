import React from 'react';

import { HelpText } from '@digdir/designsystemet-react';

import classes from 'src/components/form/HelpTextContainer.module.css';
import { useLanguage } from 'src/features/language/useLanguage';

export interface IHelpTextContainerProps {
  helpText: React.ReactNode;
  title?: string;
}

export function HelpTextContainer({ helpText, title }: IHelpTextContainerProps) {
  const { langAsString } = useLanguage();
  return (
    <div className={classes.helpTextContainer}>
      <HelpText
        title={
          title ? `${langAsString('helptext.button_title_prefix')} ${title}` : langAsString('helptext.button_title')
        }
      >
        {helpText}
      </HelpText>
    </div>
  );
}
