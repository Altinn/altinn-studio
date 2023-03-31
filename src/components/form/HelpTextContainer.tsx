import React from 'react';

import { HelpText } from '@digdir/design-system-react';

import classes from 'src/components/form/HelpTextContainer.module.css';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import type { ILanguage } from 'src/types/shared';
export interface IHelpTextContainerProps {
  language: ILanguage;
  helpText: React.ReactNode;
  title?: string;
}

export function HelpTextContainer({ language, helpText, title }: IHelpTextContainerProps) {
  return (
    <div className={classes.helpTextContainer}>
      <HelpText
        title={
          title
            ? `${getLanguageFromKey('helptext.button_title_prefix', language)} ${title}`
            : getLanguageFromKey('helptext.button_title', language)
        }
      >
        {helpText}
      </HelpText>
    </div>
  );
}
