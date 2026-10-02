import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { formatDate, isValid, parseISO } from 'date-fns';

import { DateDef } from 'src/layout/Date/config.def.generated';
import { DateComponent } from 'src/layout/Date/DateComponent';
import { DateSummary } from 'src/layout/Date/DateSummary';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { DisplayData } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Date extends DateDef implements DisplayData {
  useDisplayData(baseComponentId: string): string {
    const config = useComponentConfig(baseComponentId, 'Date');
    const value = useEvalExpression(config.value, Expressions.Date.value);

    const dateString = value;

    if (dateString === undefined) {
      return '';
    }

    const parsedValue = parseISO(dateString);
    let displayData = parsedValue.toDateString();
    if (!isValid(parsedValue)) {
      displayData = 'Ugyldig format';
    } else if (config.format) {
      displayData = formatDate(parsedValue, config.format || 'dd.MM.yyyy');
    }

    return displayData;
  }

  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Date'>>(
    function LayoutComponentNumberRender(props, _): JSX.Element | null {
      return <DateComponent {...props} />;
    },
  );

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return <DateSummary {...props} />;
  }
}
