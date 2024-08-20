import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { formatNumericText } from '@digdir/design-system-react';

import { getMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { evalFormatting } from 'src/layout/Input/formatting';
import { NumberDef } from 'src/layout/Number/config.def.generated';
import { NumberComponent } from 'src/layout/Number/NumberComponent';
import type { DisplayDataProps } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ExprResolver } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Number extends NumberDef {
  getDisplayData(node: LayoutNode<'Number'>, { currentLanguage, nodeDataSelector }: DisplayDataProps): string {
    const number = nodeDataSelector((picker) => picker(node)?.item?.value, [node]);
    if (number === undefined || isNaN(number)) {
      return '';
    }

    const text = number.toString();
    const formatting = nodeDataSelector((picker) => picker(node)?.item?.formatting, [node]);
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

  evalExpressions(props: ExprResolver<'Number'>) {
    return {
      ...this.evalDefaultExpressions(props),
      formatting: evalFormatting(props),
      value: props.evalNum(props.item.value, NaN),
    };
  }
}
