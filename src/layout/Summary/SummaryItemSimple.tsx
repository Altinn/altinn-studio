import React from 'react';

import cn from 'classnames';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import classes from 'src/layout/Summary/SummaryItemSimple.module.css';

export interface ISummaryItemSimple {
  formDataAsString: string | undefined;
  hideFromVisualTesting?: boolean;
}

export function SummaryItemSimple({ formDataAsString, hideFromVisualTesting = false }: ISummaryItemSimple) {
  const language = useAppSelector((state) => state.language.language);
  return (
    <div data-testid={'summary-item-simple'}>
      {formDataAsString ? (
        <span className={cn(classes.data, { 'no-visual-testing': hideFromVisualTesting })}>{formDataAsString}</span>
      ) : (
        <span className={classes.emptyField}>{getLanguageFromKey('general.empty_summary', language || {})}</span>
      )}
    </div>
  );
}
