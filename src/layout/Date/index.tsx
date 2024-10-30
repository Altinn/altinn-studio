import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { formatDate, isValid } from 'date-fns';

import { DateDef } from 'src/layout/Date/config.def.generated';
import { DateComponent } from 'src/layout/Date/DateComponent';
import type { DisplayDataProps } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ExprResolver } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Date extends DateDef {
  getDisplayData(node: LayoutNode<'Date'>, { nodeDataSelector }: DisplayDataProps): string {
    const dateString = nodeDataSelector((picker) => picker(node)?.item?.value, [node]);
    const format = nodeDataSelector((picker) => picker(node)?.item?.format, [node]);
    if (dateString === undefined || !isValid(dateString)) {
      return '';
    }

    return formatDate(dateString, format || 'dd.MM.yyyy');
  }

  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Date'>>(
    function LayoutComponentNumberRender(props, _): JSX.Element | null {
      return <DateComponent {...props} />;
    },
  );

  evalExpressions(props: ExprResolver<'Date'>) {
    return {
      ...this.evalDefaultExpressions(props),
      value: props.evalStr(props.item.value, ''),
    };
  }
}
