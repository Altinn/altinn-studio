import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { getMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { useResolvedFormatting } from 'src/layout/Input/formatting';
import { NumberDef } from 'src/layout/Number/config.def.generated';
import { NumberComponent } from 'src/layout/Number/NumberComponent';
import { NumberSummary } from 'src/layout/Number/NumberSummary';
import { formatNumericText } from 'src/utils/formattingUtils';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { DisplayData } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Number extends NumberDef implements DisplayData {
  useDisplayData(baseComponentId: string): string {
    const config = useComponentConfig(baseComponentId, 'Number');
    const value = useEvalExpression(config.value, Expressions.Number.value);

    const number = value;
    const formatting = useResolvedFormatting(config.formatting);
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

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return <NumberSummary {...props} />;
  }
}
