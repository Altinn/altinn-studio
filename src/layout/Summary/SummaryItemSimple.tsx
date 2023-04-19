import React from 'react';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import classes from 'src/layout/Summary/SummaryItemSimple.module.css';

export interface ISummaryItemSimple {
  formDataAsString: string | undefined;
}

export function SummaryItemSimple({ formDataAsString }: ISummaryItemSimple) {
  const language = useAppSelector((state) => state.language.language);
  return (
    <div data-testid={'summary-item-simple'}>
      {formDataAsString ? (
        <span className={classes.data}>{formDataAsString}</span>
      ) : (
        <span className={classes.emptyField}>{getLanguageFromKey('general.empty_summary', language || {})}</span>
      )}
    </div>
  );
}
