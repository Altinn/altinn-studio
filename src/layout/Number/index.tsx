import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { getMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { evalFormatting } from 'src/layout/Input/formatting';
import { NumberDef } from 'src/layout/Number/config.def.generated';
import { NumberComponent } from 'src/layout/Number/NumberComponent';
import { NumberSummary } from 'src/layout/Number/NumberSummary';
import { formatNumericText } from 'src/utils/formattingUtils';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useNodeItemWhenType } from 'src/utils/layout/useNodeItem';
import type { DisplayData } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ExprResolver } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Number extends NumberDef implements DisplayData {
  useDisplayData(baseComponentId: string): string {
    const nodeId = useIndexedId(baseComponentId);
    const item = useNodeItemWhenType(nodeId, 'Number');
    const number = item?.value;
    const formatting = item?.formatting;
    const currentLanguage = useCurrentLanguage();
    if (number === undefined || isNaN(number)) {
      return '';
    }

    const text = number.toString();
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
    return <NumberSummary {...props} />;
  }

  evalExpressions(props: ExprResolver<'Number'>) {
    return {
      ...this.evalDefaultExpressions(props),
      formatting: evalFormatting(props),
      value: props.evalNum(props.item.value, NaN),
    };
  }
}
