import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { formatNumericText } from '@digdir/design-system-react';

import { getMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { evalFormatting } from 'src/layout/Input/formatting';
import { NumberDef } from 'src/layout/Number/config.def.generated';
import { NumberComponent } from 'src/layout/Number/NumberComponent';
import { NumberSummary } from 'src/layout/Number/NumberSummary';
import type { DisplayData, DisplayDataProps } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ExprResolver } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Number extends NumberDef implements DisplayData<'Number'> {
  getDisplayData({ currentLanguage, nodeDataSelector, nodeId }: DisplayDataProps<'Number'>): string {
    const number = nodeDataSelector((picker) => picker(nodeId, 'Number')?.item?.value, [nodeId]);
    if (number === undefined || isNaN(number)) {
      return '';
    }

    const text = number.toString();
    const formatting = nodeDataSelector((picker) => picker(nodeId, 'Number')?.item?.formatting, [nodeId]);
    const numberFormatting = getMapToReactNumberConfig(formatting, text, currentLanguage);

    if (numberFormatting?.number) {
      return formatNumericText(text, numberFormatting.number);
    }

    return text;
  }

  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Number'>>(
    function LayoutComponentNumberRender(props, _): JSX.Element | null {
      return <NumberComponent {...props} />;
    },
  );

  renderSummary2(props: Summary2Props<'Number'>): JSX.Element | null {
    return (
      <NumberSummary
        componentNode={props.target}
        isCompact={props.isCompact}
        emptyFieldText={props.override?.emptyFieldText}
      />
    );
  }

  evalExpressions(props: ExprResolver<'Number'>) {
    return {
      ...this.evalDefaultExpressions(props),
      formatting: evalFormatting(props),
      value: props.evalNum(props.item.value, NaN),
    };
  }
}
