import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { formatDate, isValid, parseISO } from 'date-fns';

import { useDisplayDataProps } from 'src/features/displayData/useDisplayData';
import { DateDef } from 'src/layout/Date/config.def.generated';
import { DateComponent } from 'src/layout/Date/DateComponent';
import { DateSummary } from 'src/layout/Date/DateSummary';
import type { DisplayDataProps } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ExprResolver } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Date extends DateDef {
  getDisplayData(node: LayoutNode<'Date'>, { nodeDataSelector }: DisplayDataProps): string {
    const dateString = nodeDataSelector((picker) => picker(node)?.item?.value, [node]);
    const format = nodeDataSelector((picker) => picker(node)?.item?.format, [node]);

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

  useDisplayData(node: LayoutNode<'Date'>): string {
    const displayDataProps = useDisplayDataProps();
    return this.getDisplayData(node, displayDataProps);
  }

  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Date'>>(
    function LayoutComponentNumberRender(props, _): JSX.Element | null {
      return <DateComponent {...props} />;
    },
  );

  renderSummary2(props: Summary2Props<'Date'>): JSX.Element | null {
    return (
      <DateSummary
        componentNode={props.target}
        isCompact={props.isCompact}
        emptyFieldText={props.override?.emptyFieldText}
      />
    );
  }

  evalExpressions(props: ExprResolver<'Date'>) {
    return {
      ...this.evalDefaultExpressions(props),
      value: props.evalStr(props.item.value, ''),
    };
  }
}
