import React from 'react';

import cn from 'classnames';

import { useLanguage } from 'src/hooks/useLanguage';
import classes from 'src/layout/Summary/SummaryItemSimple.module.css';

export interface ISummaryItemSimple {
  formDataAsString: string | undefined;
  hideFromVisualTesting?: boolean;
}

export function SummaryItemSimple({ formDataAsString, hideFromVisualTesting = false }: ISummaryItemSimple) {
  const { lang } = useLanguage();
  return (
    <div data-testid={'summary-item-simple'}>
      {formDataAsString ? (
        <span className={cn(classes.data, { 'no-visual-testing': hideFromVisualTesting })}>{formDataAsString}</span>
      ) : (
        <span className={classes.emptyField}>{lang('general.empty_summary')}</span>
      )}
    </div>
  );
}
