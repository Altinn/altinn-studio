import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { formatDate, isValid, parseISO } from 'date-fns';

import { DateDef } from 'src/layout/Date/config.def.generated';
import { DateComponent } from 'src/layout/Date/DateComponent';
import { DateSummary } from 'src/layout/Date/DateSummary';
import { useNodeItemWhenType } from 'src/utils/layout/useNodeItem';
import type { DisplayData } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ExprResolver } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Date extends DateDef implements DisplayData {
  useDisplayData(nodeId: string): string {
    const item = useNodeItemWhenType(nodeId, 'Date');
    const dateString = item?.value;
    const format = item?.format;

    if (dateString === undefined) {
      return '';
    }

    const parsedValue = parseISO(dateString);
    let displayData = parsedValue.toDateString();
    if (!isValid(parsedValue)) {
      displayData = 'Ugyldig format';
    } else if (format) {
      displayData = formatDate(parsedValue, format || 'dd.MM.yyyy');
    }

    return displayData;
  }

  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Date'>>(
    function LayoutComponentNumberRender(props, _): JSX.Element | null {
      return <DateComponent {...props} />;
    },
  );

  renderSummary2(props: Summary2Props<'Date'>): JSX.Element | null {
    return <DateSummary {...props} />;
  }

  evalExpressions(props: ExprResolver<'Date'>) {
    return {
      ...this.evalDefaultExpressions(props),
      value: props.evalStr(props.item.value, ''),
    };
  }
}
