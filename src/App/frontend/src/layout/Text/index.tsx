import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { TextDef } from 'src/layout/Text/config.def.generated';
import { TextComponent } from 'src/layout/Text/TextComponent';
import { TextSummary } from 'src/layout/Text/TextSummary';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { DisplayData } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Text extends TextDef implements DisplayData {
  useDisplayData(baseComponentId: string): string {
    const config = useComponentConfig(baseComponentId, 'Text');
    const value = useEvalExpression(config.value, Expressions.Text.value);

    const text = value;
    if (!text) {
      return '';
    }
    return text;
  }

  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Text'>>(
    function LayoutComponentTextRender(props, _): JSX.Element | null {
      return <TextComponent {...props} />;
    },
  );

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return <TextSummary {...props} />;
  }
}
